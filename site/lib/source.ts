import { loader, type VirtualFile } from "fumadocs-core/source";
import { docs } from "@/.source";

const raw = docs.toFumadocsSource() as unknown as {
  files:
    | Array<{ type: string; path: string; data: unknown; absolutePath: string }>
    | (() => Array<{ type: string; path: string; data: unknown; absolutePath: string }>);
};

export const source = loader({
  baseUrl: "/docs",
  source: {
    files: (typeof raw.files === "function" ? raw.files() : raw.files) as VirtualFile[],
  },
});
