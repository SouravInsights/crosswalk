import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ReviewedTool } from "../types.js";
import { form } from "./form.js";

/** A reviewed form tool with the fields the safety pipeline normally supplies. */
function reviewedTool(overrides: Partial<ReviewedTool> = {}): ReviewedTool {
  return {
    id: "POST /profile",
    name: "save-profile",
    source: { kind: "schema", ref: "save-profile" },
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The person's full name." },
        description: { type: "string", description: "A short profile description." },
      },
      required: ["name"],
    },
    inputTypeName: "SaveProfileInput",
    sideEffect: "write",
    endpointRole: "endpoint",
    enabledByDefault: false,
    withheld: false,
    requiresAuth: true,
    description: "Save the profile details.",
    descriptionSource: "declared",
    riskTier: "write-confirm",
    hints: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      untrustedContentHint: false,
    },
    piiInOutput: [],
    form: { path: "src/ProfileForm.tsx" },
    ...overrides,
  };
}

async function writeComponent(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

describe("form output", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "webmcp-codegen-form-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("annotates a realistic TSX form and changes only by inserting attributes", async () => {
    const source = `import { Input } from "@acme/design-system";

export function ProfileForm() {
  return (
    <form className="profile-card">
      <Input id="name" />
      <textarea name="description" />
      <button type="submit">Save profile</button>
    </form>
  );
}
`;
    const path = join(cwd, "src/ProfileForm.tsx");
    await writeComponent(path, source);

    const [file] = await form().generate([reviewedTool()], cwd);

    expect(file?.action).toBe("update");
    expect(file?.path).toBe(path);
    expect(file?.contents).toContain(
      '<form className="profile-card" toolname="save-profile" tooldescription="Save the profile details.">',
    );
    expect(file?.contents).not.toContain("toolautosubmit");
    expect(file?.contents).toContain(
      '<Input id="name" name="name" toolparamdescription="The person\'s full name." />',
    );
    expect(file?.contents).toContain(
      '<textarea name="description" toolparamdescription="A short profile description." />',
    );
    expect(file?.contents).toContain('<button type="submit">Save profile</button>');
    expect(file?.notes).toContain(
      'added name="name" to the control with id="name" (WebMCP addresses fields by name)',
    );
    expect(file?.notes).toContain(
      "withheld toolautosubmit (write form): the agent fills the form, a human submits",
    );

    const restored = file?.contents
      .replace(' toolname="save-profile"', "")
      .replace(' tooldescription="Save the profile details."', "")
      .replace(' name="name"', "")
      .replace(' toolparamdescription="The person\'s full name."', "")
      .replace(' toolparamdescription="A short profile description."', "");
    expect(restored).toBe(source);
  });

  it("adds toolautosubmit automatically for a read tool", async () => {
    const path = join(cwd, "src/SearchForm.tsx");
    await writeComponent(path, '<form><input name="query" /></form>\n');
    const tool = reviewedTool({
      name: "search-profile",
      description: "Find matching profiles.",
      sideEffect: "read",
      inputSchema: { type: "object", properties: { query: { description: "Search text." } } },
      form: { path: "src/SearchForm.tsx" },
    });

    const [file] = await form().generate([tool], cwd);

    expect(file?.contents).toContain(
      '<form toolname="search-profile" tooldescription="Find matching profiles." toolautosubmit>',
    );
    expect(file?.notes).not.toContain(
      "withheld toolautosubmit (write form): the agent fills the form, a human submits",
    );
  });

  it("adds autosubmit for an explicitly opted-in write without a withhold note", async () => {
    const path = join(cwd, "src/ProfileForm.tsx");
    await writeComponent(path, '<form><input name="name" /></form>\n');
    const tool = reviewedTool({ form: { path: "src/ProfileForm.tsx", autosubmit: true } });

    const [file] = await form().generate([tool], cwd);

    expect(file?.contents).toContain("toolautosubmit");
    expect(file?.notes).not.toContain(
      "withheld toolautosubmit (write form): the agent fills the form, a human submits",
    );
  });

  it("is idempotent after writing the first annotation", async () => {
    const path = join(cwd, "src/ProfileForm.tsx");
    await writeComponent(path, '<form><Input id="name" /></form>\n');
    const output = form();

    const [first] = await output.generate([reviewedTool()], cwd);
    await writeComponent(path, first?.contents ?? "");
    const [second] = await output.generate([reviewedTool()], cwd);

    expect(second?.action).toBe("unchanged");
    expect(second?.contents).toBe(first?.contents);
    expect(await readFile(path, "utf8")).toBe(first?.contents);
  });

  it("withholds autosubmit for writes by default but honors an explicit false", async () => {
    const path = join(cwd, "src/ProfileForm.tsx");
    await writeComponent(path, '<form><input name="name" /></form>\n');
    const tool = reviewedTool({ form: { path: "src/ProfileForm.tsx", autosubmit: false } });

    const [file] = await form().generate([tool], cwd);

    expect(file?.contents).not.toContain("toolautosubmit");
    expect(file?.notes).not.toContain(
      "withheld toolautosubmit (write form): the agent fills the form, a human submits",
    );
  });

  it("does not edit a file for an unmatched field and reports an actionable note", async () => {
    const source =
      '<form toolname="save-profile" tooldescription="Save the profile details.">\n' +
      '  <input name="name" toolparamdescription="The person\'s full name." />\n' +
      "</form>\n";
    const path = join(cwd, "src/ProfileForm.tsx");
    await writeComponent(path, source);
    const tool = reviewedTool({
      inputSchema: { type: "object", properties: { missing: { description: "Not rendered." } } },
    });

    const [file] = await form().generate([tool], cwd);

    expect(file?.action).toBe("unchanged");
    expect(file?.contents).toBe(source);
    expect(file?.notes).toContain(
      'no control named "missing" in src/ProfileForm.tsx; add name="missing" to the control or remove the field from the schema',
    );
  });

  it("keeps existing attributes and reports every hand-edited value", async () => {
    const source = `<form
  toolname="hand-picked-name"
  tooldescription='Use the copy written by the product team.'
  toolautosubmit
>
  <input name="name" toolparamdescription="The approved wording." />
</form>
`;
    const path = join(cwd, "src/ProfileForm.tsx");
    await writeComponent(path, source);

    const [file] = await form().generate([reviewedTool()], cwd);

    expect(file?.action).toBe("unchanged");
    expect(file?.contents).toBe(source);
    expect(file?.notes).toEqual([
      "kept your toolname on <form>",
      "kept your tooldescription on <form>",
      "kept your toolautosubmit on <form>",
      'kept your toolparamdescription for "name"',
      'no control named "description" in src/ProfileForm.tsx; add name="description" to the control or remove the field from the schema',
    ]);
  });

  it("formats additions on their own indented lines for multiline tags", async () => {
    const source = `export function ProfileForm() {
  return (
    <form
      className="profile-card"
      method="post"
    >
      <Input
        id="name"
      />
      <textarea
        name="description"
      />
    </form>
  );
}
`;
    const path = join(cwd, "src/ProfileForm.tsx");
    await writeComponent(path, source);

    const [file] = await form().generate([reviewedTool()], cwd);

    expect(file?.contents).toContain(
      `    <form
      className="profile-card"
      method="post"
      toolname="save-profile"
      tooldescription="Save the profile details."
    >`,
    );
    expect(file?.contents).toContain(
      `      <Input
        id="name"
        name="name"
        toolparamdescription="The person's full name."
      />`,
    );
    expect(file?.contents).toContain(
      `      <textarea
        name="description"
        toolparamdescription="A short profile description."
      />`,
    );
  });

  it("quotes JSX values according to the quotes they contain", async () => {
    const path = join(cwd, "src/ProfileForm.tsx");
    await writeComponent(path, '<form><input name="quote" /></form>\n');
    const tool = reviewedTool({
      description: 'Say "hello"',
      inputSchema: {
        type: "object",
        properties: { quote: { description: `Use "double" and 'single'.` } },
      },
    });

    const [file] = await form().generate([tool], cwd);

    expect(file?.contents).toContain("tooldescription='Say \"hello\"'");
    expect(file?.contents).toContain(
      `toolparamdescription={${JSON.stringify(`Use "double" and 'single'.`)}}`,
    );
  });

  it("annotates only the first form open tag", async () => {
    const path = join(cwd, "src/Forms.tsx");
    await writeComponent(
      path,
      '<form id="first"><input name="name" /></form>\n<form id="second"><input name="description" /></form>\n',
    );
    const tool = reviewedTool({ form: { path: "src/Forms.tsx" } });

    const [file] = await form().generate([tool], cwd);

    expect(file?.contents).toContain('<form id="first" toolname="save-profile"');
    expect(file?.contents).toContain('<form id="second">');
    expect(file?.contents).not.toContain('<form id="second" toolname=');
  });

  it("throws a tool-named error when the file has no form", async () => {
    const path = join(cwd, "src/ProfileForm.tsx");
    await writeComponent(path, "export function ProfileForm() { return <div />; }\n");

    await expect(form().generate([reviewedTool()], cwd)).rejects.toThrow(
      `form output for "save-profile": no <form> element found in ${path}`,
    );
  });

  it("throws the same tool-named error when the pointed file is unreadable", async () => {
    const path = join(cwd, "src/does-not-exist.tsx");
    const tool = reviewedTool({ form: { path: "src/does-not-exist.tsx" } });

    await expect(form().generate([tool], cwd)).rejects.toThrow(
      `form output for "save-profile": no <form> element found in ${path}`,
    );
  });
});
