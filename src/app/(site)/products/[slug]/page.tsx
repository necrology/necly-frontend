import type { Metadata } from "next";
import { Home } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommerceProductCard } from "@/components/commerce-product-card";
import { ProductDetailClient } from "@/components/product-detail-client";
import { getProduct, getRelatedProducts, products, type CommerceProduct } from "@/data/products";
import { getService, services } from "@/data/seed";
import { catalogApi, DEMO_MODE } from "@/lib/api";
import { mapApiProduct } from "@/lib/product-mapper";
import type { SubscriptionProduct } from "@/lib/types";

const logoTones: Array<[RegExp, CommerceProduct["logoTone"]]> = [
  [/netflix/i, "netflix"],
  [/disney/i, "disney"],
  [/apple/i, "apple"],
  [/viu/i, "viu"],
  [/nord/i, "nord"],
  [/spotify|music/i, "spotify"],
  [/youtube/i, "youtube"],
  [/office|microsoft|365|cloud/i, "microsoft"],
];

function inferLogoTone(name: string): CommerceProduct["logoTone"] {
  return logoTones.find(([pattern]) => pattern.test(name))?.[1] ?? "microsoft";
}

/** Adapts any catalog product (legacy seed or backend API) to the storefront card/detail shape. */
export function toCommerceProduct(product: SubscriptionProduct): CommerceProduct {
  const option = product.priceOptions[0];
  const groupMembers = 4;
  const providerPrice = product.price * groupMembers;

  return {
    ...product,
    brand: product.name,
    packageName: option?.label ?? product.duration,
    logoTone: inferLogoTone(product.name),
    providerPrice,
    groupMembers,
    discount: 0,
  };
}

export async function fetchProductFromApi(slug: string): Promise<CommerceProduct | null> {
  if (DEMO_MODE) return null;
  try {
    const product = await catalogApi.getProduct(slug);
    return product ? toCommerceProduct(mapApiProduct(product)) : null;
  } catch {
    return null;
  }
}

async function resolveProduct(slug: string): Promise<CommerceProduct | null> {
  return getProduct(slug) ?? (getService(slug) ? toCommerceProduct(getService(slug)!) : null) ?? (await fetchProductFromApi(slug));
}

export function generateStaticParams() {
  return [...products.map((product) => product.slug), ...services.map((service) => service.slug)].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await resolveProduct(slug);
  return product ? { title: product.name, description: product.summary } : { title: "Produk tidak ditemukan" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await resolveProduct(slug);
  if (!product) notFound();
  const related = getRelatedProducts(product);

  return (
    <main className="commerce-detail-page">
      <div className="commerce-container">
        <nav className="commerce-breadcrumbs" aria-label="Breadcrumb"><Link href="/" aria-label="Beranda"><Home size={18} fill="currentColor" /></Link><span>›</span><Link href="/products">Produk</Link><span>›</span><span>{product.name}</span></nav>
        <ProductDetailClient product={product} />
        {related.length > 0 && <section className="commerce-related-products"><header><span /><h2>Produk Serupa</h2><Link href="/products">Lihat Semua Produk →</Link></header><div>{related.map((item) => <CommerceProductCard product={item} compact actionLabel="Lihat Detail" key={item.id} />)}</div></section>}
      </div>
    </main>
  );
}
