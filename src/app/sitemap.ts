import type { MetadataRoute } from "next";
import { products } from "@/data/products";
import { services } from "@/data/seed";
import { catalogApi, DEMO_MODE } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticRoutes = ["", "/products", "/about", "/testimoni", "/cara-berlangganan", "/faq", "/laporan-kendala", "/login", "/register", "/kebijakan-privasi", "/syarat-ketentuan"];

  // Seed hanya dipakai saat demo eksplisit. Live mode mengambil slug dari API;
  // kegagalan API tidak boleh mengiklankan halaman seed yang tidak ada.
  let slugs: string[] = [];
  if (DEMO_MODE) {
    slugs = [...new Set([...products.map((product) => product.slug), ...services.map((service) => service.slug)])];
  } else {
    try {
      const response = await catalogApi.listProducts({ per_page: 100 });
      slugs = [...new Set(response.products.map((product) => product.slug))];
    } catch {
      slugs = [];
    }
  }

  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: new Date(), changeFrequency: route === "/products" ? "daily" as const : "monthly" as const, priority: route === "" ? 1 : .7 })),
    ...slugs.map((slug) => ({ url: `${base}/products/${slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: .8 })),
  ];
}
