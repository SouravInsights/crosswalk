/**
 * Sources read an existing contract and produce candidate tools.
 *
 * Import them from "@webmcp-stack/codegen/sources":
 *
 *   import { openapi, schema } from "@webmcp-stack/codegen/sources";
 */
export { openapi } from "./openapi.js";
export { schema } from "./schema.js";
export type { SchemaSourceOptions, SchemaToolEntry } from "./schema.js";
