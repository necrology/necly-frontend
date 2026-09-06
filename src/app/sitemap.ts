import type { MetadataRoute } from "next";
import { services } from "@/data/seed";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticRoutes = ["", "/products", "/about", "/login", "/register"];
  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: new Date(), changeFrequency: route === "/products" ? "daily" as const : "monthly" as const, priority: route === "" ? 1 : .7 })),
    ...services.map((service) => ({ url: `${base}/products/${service.slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: .8 })),
  ];
}
