# webmcp-codegen

## 0.2.0

### Minor Changes

- 447c12f: Zero-config `generate`: auto-detects OpenAPI/Swagger specs anywhere in the project (monorepo layouts included), so `npx webmcp-codegen generate` now works with no install and no config file. Adds `--spec` and `--out` flags as config-free overrides; `init` remains the path to full control via codegen.config.mjs.

## 0.1.0

### Minor Changes

- First release: OpenAPI source, safety audit, js generator, init/generate CLI
