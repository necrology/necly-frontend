import type { MetadataRoute } from "next";
import { products } from "@/data/products";
import { services } from "@/data/seed";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticRoutes = ["", "/products", "/about", "/login", "/register"];
  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: new Date(), changeFrequency: route === "/products" ? "daily" as const : "monthly" as const, priority: route === "" ? 1 : .7 })),
    ...[...products.map((product) => product.slug), ...services.map((service) => service.slug)].map((slug) => ({ url: `${base}/products/${slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: .8 })),
  ];
}
