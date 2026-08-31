import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span style={{ fontWeight: 700, letterSpacing: "0.02em" }}>
          <span style={{ color: "#7ee787" }}>●</span> webmcp-codegen
        </span>
      ),
    },
    links: [
      { text: "Docs", url: "/docs" },
      { text: "GitHub", url: "https://github.com/SouravInsights/crosswalk", external: true },
    ],
  };
}
