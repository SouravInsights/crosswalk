---
"@webmcp-stack/codegen": patch
---

Absolute paths now win over the project directory. The `tools` output's `outDir` and the `--config` existence check used `path.join(cwd, path)`, which nests an absolute path under the project (`--out /tmp/out` became `<project>/tmp/out`). They now resolve correctly.
