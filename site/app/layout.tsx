import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s | Groundstate",
    default: "Groundstate — give your coding agent ground truth about your running app",
  },
  description:
    "Dev-only SDK that exposes your web app's real state and actions as WebMCP tools, so your coding agent stops guessing from screenshots.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
