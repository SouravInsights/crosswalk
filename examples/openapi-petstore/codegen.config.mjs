import { defineConfig } from "@webmcp-stack/codegen";
import { js } from "@webmcp-stack/codegen/generators";
import { openapi } from "@webmcp-stack/codegen/sources";

export default defineConfig({
  sources: [openapi({ spec: "./openapi.yaml" })],
  generate: [js({ outDir: "./src/webmcp" })],
  safety: {
    // Extra field names to treat as PII, on top of the built-in list:
    // piiFields: ["internalId"],
    // Tools to skip entirely (matched against name and route):
    // exclude: ["internal"],
  },
});
