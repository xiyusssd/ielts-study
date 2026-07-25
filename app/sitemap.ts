import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const now = new Date();
  const pages = [
    { url: "", priority: 1.0, changeFrequency: "daily" as const },
    { url: "/login", priority: 0.5, changeFrequency: "yearly" as const },
    { url: "/signup", priority: 0.5, changeFrequency: "yearly" as const },
    { url: "/help", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { url: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  ];
  return pages.map((p) => ({
    url: `${base}${p.url}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
