import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/logo";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo product="codegen" />,
    },
    links: [
      { text: "Docs", url: "/docs" },
      { text: "GitHub", url: "https://github.com/SouravInsights/webmcp-stack", external: true },
    ],
  };
}
