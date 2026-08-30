import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: {
    template: "%s | webmcp-codegen",
    default: "webmcp-codegen: generate WebMCP tools from the API spec you already have",
  },
  description:
    "Turn an OpenAPI spec into safe, typed, human-reviewed WebMCP tools. Real files in your repo: contracts regenerate, your code survives, safety audit built in.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
