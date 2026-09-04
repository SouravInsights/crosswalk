/**
 * The `form` output annotates the form a user already sees instead of creating
 * a second generated tool file. Keeping the declarative surface in place lets
 * an agent fill the visible controls while a human reviews and submits writes.
 * A separate generated implementation could bypass that human-in-the-loop step.
 *
 * Known limitation, owned by the "real parser" follow-up: the scanner is quote-
 * and brace-aware inside tags, but not aware of JS comments or string literals
 * outside them, so a `<form` written inside a comment could be matched. The
 * answer when real codebases defeat the scanner is a proper parser, not more
 * heuristics here.
 */

import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { GeneratedFile, Output, ReviewedTool } from "../types.js";

type FormPointer = NonNullable<ReviewedTool["form"]>;

type Quote = '"' | "'" | "`";

interface ParsedAttribute {
  name: string;
  value?: string;
  start: number;
}

interface OpenTag {
  start: number;
  end: number;
  closeStart: number;
  name: string;
  attributes: ParsedAttribute[];
  multiline: boolean;
}

interface Insertion {
  at: number;
  text: string;
}

/** Create the in-place form output used by configs with declarative forms. */
export function form(): Output {
  return {
    kind: "form",
    outDir: ".",
    async generate(tools, cwd) {
      const files: GeneratedFile[] = [];
      for (const tool of tools) {
        // The pipeline sends only form-backed tools. This guard keeps direct
        // use of the output harmless when a caller passes a mixed list.
        if (!tool.form) continue;
        files.push(await annotateForm(tool, tool.form, cwd));
      }
      return files;
    },
  };
}

/** Read one pointed-to component and merge only the missing WebMCP attributes. */
async function annotateForm(
  tool: ReviewedTool,
  pointer: FormPointer,
  cwd: string,
): Promise<GeneratedFile> {
  const path = resolve(cwd, pointer.path);
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch {
    throw noFormError(tool.name, path);
  }

  const tags = scanOpenTags(source);
  const formTag = tags.find((tag) => isFormTag(source, tag));
  if (!formTag) throw noFormError(tool.name, path);

  const notes: string[] = [];
  const additions = new Map<OpenTag, string[]>();

  addFormAttributes(tool, pointer, formTag, additions, notes);
  addFieldAttributes(tool, path, cwd, tags, additions, notes);

  const contents = applyInsertions(source, additions);
  return {
    path,
    contents,
    action: contents === source ? "unchanged" : "update",
    notes,
  };
}

/** Keep hand-authored form metadata because regeneration must not erase intent. */
function addFormAttributes(
  tool: ReviewedTool,
  pointer: FormPointer,
  formTag: OpenTag,
  additions: Map<OpenTag, string[]>,
  notes: string[],
): void {
  addMissingAttribute(
    formTag,
    "toolname",
    tool.name,
    "kept your toolname on <form>",
    additions,
    notes,
  );
  addMissingAttribute(
    formTag,
    "tooldescription",
    tool.description,
    "kept your tooldescription on <form>",
    additions,
    notes,
  );

  const hasAutosubmit = hasAttribute(formTag, "toolautosubmit");
  const shouldAutosubmit = tool.sideEffect === "read" || pointer.autosubmit === true;
  if (hasAutosubmit) {
    notes.push("kept your toolautosubmit on <form>");
  } else if (shouldAutosubmit) {
    addAttribute(formTag, "toolautosubmit", undefined, additions);
  } else if (pointer.autosubmit === undefined) {
    // Reads can submit safely, but a write should stop at the visible form so
    // a human gets the final say before the browser changes anything.
    notes.push("withheld toolautosubmit (write form): the agent fills the form, a human submits");
  }
}

/** Match schema fields conservatively so a typo never annotates an unrelated control. */
function addFieldAttributes(
  tool: ReviewedTool,
  path: string,
  cwd: string,
  tags: OpenTag[],
  additions: Map<OpenTag, string[]>,
  notes: string[],
): void {
  const properties = tool.inputSchema.properties ?? {};
  const relativePath = relative(cwd, path) || ".";

  for (const [key, schema] of Object.entries(properties)) {
    const control = findControl(tags, key);
    if (!control) {
      // Guessing a control would silently expose the wrong input. A report
      // note gives the developer an actionable choice instead.
      notes.push(
        `no control named "${key}" in ${relativePath}; add name="${key}" to the control or remove the field from the schema`,
      );
      continue;
    }

    const matchedById = hasMatchingAttribute(control, "id", key);
    if (matchedById && !hasAttribute(control, "name")) {
      addAttribute(control, "name", key, additions);
      notes.push(
        `added name="${key}" to the control with id="${key}" (WebMCP addresses fields by name)`,
      );
    }

    if (hasAttribute(control, "toolparamdescription")) {
      // A developer may have made the generated wording more precise. Keep it
      // as the source of truth rather than overwriting a useful hand edit.
      notes.push(`kept your toolparamdescription for "${key}"`);
    } else if (typeof schema.description === "string" && schema.description.length > 0) {
      addAttribute(control, "toolparamdescription", schema.description, additions);
    } else {
      // The pipeline's describe layer guarantees every field carries text, so
      // this only fires when the output is driven directly. An empty
      // toolparamdescription would be a plausible-looking lie; a note is not.
      notes.push(`no description text for "${key}"; nothing annotated`);
    }
  }
}

/** Return the first supported control whose literal name or id matches a field. */
function findControl(tags: OpenTag[], key: string): OpenTag | undefined {
  return tags.find(
    (tag) =>
      isControlTag(tag) &&
      (hasMatchingAttribute(tag, "name", key) || hasMatchingAttribute(tag, "id", key)),
  );
}

/** Restrict annotation to native form controls and capitalized JSX wrappers. */
function isControlTag(tag: OpenTag): boolean {
  return (
    tag.name === "input" ||
    tag.name === "textarea" ||
    tag.name === "select" ||
    /^[A-Z]/.test(tag.name)
  );
}

/** Match a static attribute value without guessing at dynamic JSX expressions. */
function hasMatchingAttribute(tag: OpenTag, name: string, value: string): boolean {
  return tag.attributes.some((attribute) => attribute.name === name && attribute.value === value);
}

function hasAttribute(tag: OpenTag, name: string): boolean {
  return tag.attributes.some((attribute) => attribute.name === name);
}

/** Add an attribute only when absent, while recording hand-edited attributes. */
function addMissingAttribute(
  tag: OpenTag,
  name: string,
  value: string,
  keptNote: string,
  additions: Map<OpenTag, string[]>,
  notes: string[],
): void {
  if (hasAttribute(tag, name)) {
    notes.push(keptNote);
    return;
  }
  addAttribute(tag, name, value, additions);
}

function addAttribute(
  tag: OpenTag,
  name: string,
  value: string | undefined,
  additions: Map<OpenTag, string[]>,
): void {
  const attributes = additions.get(tag) ?? [];
  attributes.push(value === undefined ? name : quoteAttribute(name, value));
  additions.set(tag, attributes);
}

/** Apply edits from the end so every untouched source slice keeps its offset and text. */
function applyInsertions(source: string, additions: Map<OpenTag, string[]>): string {
  const insertions: Insertion[] = [];
  for (const [tag, attributes] of additions) {
    if (attributes.length === 0) continue;
    const insertion = formatInsertion(source, tag, attributes);
    insertions.push(insertion);
  }

  let contents = source;
  insertions.sort((left, right) => right.at - left.at);
  for (const insertion of insertions) {
    contents = contents.slice(0, insertion.at) + insertion.text + contents.slice(insertion.at);
  }
  return contents;
}

/** Use readable JSX formatting while leaving the original tag text untouched. */
function formatInsertion(source: string, tag: OpenTag, attributes: string[]): Insertion {
  const text = attributes.join(" ");
  if (!tag.multiline) {
    const before = source[tag.closeStart - 1] ?? "";
    const leading = /\s/.test(before) ? "" : " ";
    // A trailing space keeps the familiar `attribute />` form when a tag is
    // self-closing; it also makes an inserted attribute visibly separate from `/`.
    const trailing = source[tag.closeStart] === "/" ? " " : "";
    return { at: tag.closeStart, text: `${leading}${text}${trailing}` };
  }

  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const indent = attributeIndent(source, tag);
  const lines = attributes.map((attribute) => `${indent}${attribute}`);
  const lineStart = source.lastIndexOf("\n", tag.closeStart - 1) + 1;
  const beforeCloseOnLine = source.slice(lineStart, tag.closeStart);

  if (beforeCloseOnLine.trim() === "") {
    // The closing marker already owns a line, so inserting at that line's start
    // preserves its indentation and keeps each new attribute on its own line.
    return { at: lineStart, text: `${lines.join(newline)}${newline}` };
  }

  // A multiline tag whose marker follows the last attribute needs a new line;
  // indenting the marker to the tag keeps the moved marker readable too.
  const tagIndent = tagLineIndent(source, tag);
  return {
    at: tag.closeStart,
    text: `${newline}${lines.join(newline)}${newline}${tagIndent}`,
  };
}

/** Prefer the indentation used by a continuation attribute line. */
function attributeIndent(source: string, tag: OpenTag): string {
  const firstLineStart = source.lastIndexOf("\n", tag.start - 1) + 1;
  for (const attribute of tag.attributes) {
    const lineStart = source.lastIndexOf("\n", attribute.start - 1) + 1;
    if (lineStart <= firstLineStart) continue;
    const prefix = source.slice(lineStart, attribute.start);
    if (/^[ \t]*$/.test(prefix)) return prefix;
  }
  return `${tagLineIndent(source, tag)}  `;
}

function tagLineIndent(source: string, tag: OpenTag): string {
  const lineStart = source.lastIndexOf("\n", tag.start - 1) + 1;
  const prefix = source.slice(lineStart, tag.start);
  return prefix.match(/^[ \t]*/)?.[0] ?? "";
}

/** JSX uses different quoting forms depending on which quote characters a value contains. */
function quoteAttribute(name: string, value: string): string {
  if (!value.includes('"')) return `${name}="${value}"`;
  if (!value.includes("'")) return `${name}='${value}'`;
  return `${name}={${JSON.stringify(value)}}`;
}

/** Find JSX opening tags without treating `>` inside quoted or braced attributes as a close. */
function scanOpenTags(source: string): OpenTag[] {
  const tags: OpenTag[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf("<", cursor);
    if (start === -1) break;
    if (source[start + 1] === "/" || source[start + 1] === "!" || source[start + 1] === "?") {
      cursor = start + 1;
      continue;
    }

    const name = readTagName(source, start);
    if (!name) {
      cursor = start + 1;
      continue;
    }
    const nameEnd = start + 1 + name.length;
    const end = findTagEnd(source, nameEnd);
    if (end === -1) {
      cursor = nameEnd;
      continue;
    }

    const closeStart = source[end - 1] === "/" ? end - 1 : end;
    tags.push({
      start,
      end: end + 1,
      closeStart,
      name,
      attributes: parseAttributes(source, nameEnd, closeStart),
      multiline: source.slice(start, end + 1).includes("\n"),
    });
    cursor = end + 1;
  }
  return tags;
}

function readTagName(source: string, start: number): string | undefined {
  if (!/[A-Za-z]/.test(source[start + 1] ?? "")) return undefined;
  let end = start + 2;
  while (end < source.length && /[A-Za-z0-9_.:-]/.test(source[end] ?? "")) end += 1;
  return source.slice(start + 1, end);
}

function isFormTag(source: string, tag: OpenTag): boolean {
  return tag.name === "form" && /[\s>]/.test(source[tag.start + 5] ?? "");
}

function findTagEnd(source: string, start: number): number {
  let quote: Quote | undefined;
  let escaped = false;
  let braces = 0;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (braces > 0) {
      if (character === '"' || character === "'" || character === "`") {
        quote = character;
      } else if (character === "{") {
        braces += 1;
      } else if (character === "}") {
        braces -= 1;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
    } else if (character === "{") {
      braces = 1;
    } else if (character === ">") {
      return index;
    }
  }
  return -1;
}

function parseAttributes(source: string, start: number, end: number): ParsedAttribute[] {
  const attributes: ParsedAttribute[] = [];
  let cursor = start;

  while (cursor < end) {
    cursor = skipWhitespace(source, cursor, end);
    if (cursor >= end) break;
    if (source[cursor] === "/") {
      cursor += 1;
      continue;
    }
    if (source[cursor] === "{") {
      cursor = consumeExpression(source, cursor, end);
      continue;
    }

    const attributeStart = cursor;
    while (
      cursor < end &&
      !/\s/.test(source[cursor] ?? "") &&
      source[cursor] !== "=" &&
      source[cursor] !== "/" &&
      source[cursor] !== "{" &&
      source[cursor] !== "}"
    ) {
      cursor += 1;
    }
    const name = source.slice(attributeStart, cursor);
    if (!name) {
      cursor += 1;
      continue;
    }

    cursor = skipWhitespace(source, cursor, end);
    let value: string | undefined;
    if (source[cursor] === "=") {
      cursor = skipWhitespace(source, cursor + 1, end);
      const parsed = parseAttributeValue(source, cursor, end);
      value = parsed.value;
      cursor = parsed.end;
    }
    attributes.push({ name, value, start: attributeStart });
  }
  return attributes;
}

function parseAttributeValue(
  source: string,
  start: number,
  end: number,
): { value: string | undefined; end: number } {
  const opening = source[start];
  if (opening === '"' || opening === "'") {
    let cursor = start + 1;
    let escaped = false;
    while (cursor < end) {
      const character = source[cursor];
      if (!escaped && character === opening) {
        return { value: source.slice(start + 1, cursor), end: cursor + 1 };
      }
      escaped = !escaped && character === "\\";
      if (character !== "\\") escaped = false;
      cursor += 1;
    }
    return { value: undefined, end };
  }

  if (opening === "{") {
    const expressionEnd = consumeExpression(source, start, end);
    const expression = source.slice(start + 1, expressionEnd - 1).trim();
    return { value: staticExpressionString(expression), end: expressionEnd };
  }

  let cursor = start;
  while (cursor < end && !/\s/.test(source[cursor] ?? "")) cursor += 1;
  return { value: source.slice(start, cursor), end: cursor };
}

function staticExpressionString(expression: string): string | undefined {
  if (expression.startsWith('"') && expression.endsWith('"')) {
    try {
      const value: unknown = JSON.parse(expression);
      return typeof value === "string" ? value : undefined;
    } catch {
      return undefined;
    }
  }
  if (expression.startsWith("'") && expression.endsWith("'")) {
    return expression.slice(1, -1).replace(/\\(['\\])/g, "$1");
  }
  return undefined;
}

function skipWhitespace(source: string, start: number, end: number): number {
  let cursor = start;
  while (cursor < end && /\s/.test(source[cursor] ?? "")) cursor += 1;
  return cursor;
}

function consumeExpression(source: string, start: number, end: number): number {
  let braces = 0;
  let quote: Quote | undefined;
  let escaped = false;

  for (let cursor = start; cursor < end; cursor += 1) {
    const character = source[cursor];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
    } else if (character === "{") {
      braces += 1;
    } else if (character === "}") {
      braces -= 1;
      if (braces === 0) return cursor + 1;
    }
  }
  return end;
}

function noFormError(toolName: string, path: string): Error {
  return new Error(`form output for "${toolName}": no <form> element found in ${path}`);
}
