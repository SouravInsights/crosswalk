import { defineConfig } from "@webmcp-stack/codegen";
import { tools } from "@webmcp-stack/codegen/outputs";
import { openapi } from "@webmcp-stack/codegen/sources";

export default defineConfig({
  sources: [openapi({ spec: "./openapi.yaml" })],
  outputs: [tools({ outDir: "./src/webmcp" })],
  safety: {
    // Extra field names to treat as PII, on top of the built-in list:
    // piiFields: ["internalId"],
    // Tools to skip entirely (matched against name and route):
    // exclude: ["internal"],
  },
});
