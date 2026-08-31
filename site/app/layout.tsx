import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

const DESCRIPTION =
  "Turn an OpenAPI spec into safe, typed, human-reviewed WebMCP tools. Real files in your repo: contracts regenerate, your code survives, safety audit built in.";

export const metadata: Metadata = {
  metadataBase: new URL("https://webmcp-stack.vercel.app"),
  title: {
    template: "%s | webmcp-stack",
    default: "webmcp-stack: generate WebMCP tools from the API spec you already have",
  },
  description: DESCRIPTION,
  keywords: [
    "WebMCP",
    "MCP",
    "AI agents",
    "OpenAPI",
    "code generation",
    "agent tools",
    "model context protocol",
  ],
  openGraph: {
    type: "website",
    siteName: "webmcp-stack",
    title: "webmcp-stack: generate WebMCP tools from the API spec you already have",
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "webmcp-stack" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "webmcp-stack: generate WebMCP tools from the API spec you already have",
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
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
