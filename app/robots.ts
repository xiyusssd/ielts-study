import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/help", "/terms", "/privacy", "/login", "/signup"],
        disallow: [
          "/api/",
          "/settings/",
          "/vocab/",
          "/reading/",
          "/listening/",
          "/writing/",
          "/speaking/",
          "/assessment/",
          "/plan/",
        ],
      },
      // AI 爬虫
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sitemap.xml`,
  };
}
