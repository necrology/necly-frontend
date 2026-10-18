import type { Metadata } from "next";
import { Home } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommerceProductCard } from "@/components/commerce-product-card";
import { ProductDetailClient } from "@/components/product-detail-client";
import { getProduct, getRelatedProducts, type CommerceProduct } from "@/data/products";
import { getService } from "@/data/seed";
import { ApiError, catalogApi, DEMO_MODE } from "@/lib/api";
import { mapApiCommerceProduct, toCommerceProduct } from "@/lib/commerce-product";

// Halaman detail live harus membaca katalog pada setiap permintaan; jangan
// membekukan hasil build ketika backend belum tentu tersedia.
export const dynamic = "force-dynamic";

export async function fetchProductFromApi(slug: string): Promise<CommerceProduct | null> {
  if (DEMO_MODE) return null;
  try {
    const product = await catalogApi.getProduct(slug);
    return product ? mapApiCommerceProduct(product) : null;
  } catch (error) {
    // 404 berarti produk memang tidak ada. Kegagalan lain tidak boleh berubah
    // menjadi produk contoh atau halaman "tidak ditemukan" yang menyesatkan.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function resolveProduct(slug: string): Promise<CommerceProduct | null> {
  if (DEMO_MODE) {
    return getProduct(slug) ?? (getService(slug) ? toCommerceProduct(getService(slug)!) : null);
  }
  // Live mode tidak pernah membaca seed terlebih dahulu: produk contoh hanya
  // boleh muncul saat DEMO_MODE eksplisit.
  return fetchProductFromApi(slug);
}

async function resolveRelated(product: CommerceProduct): Promise<CommerceProduct[]> {
  if (DEMO_MODE) return getRelatedProducts(product);
  try {
    const response = await catalogApi.listProducts({ per_page: 100 });
    return response.products
      .map(mapApiCommerceProduct)
      .filter((candidate) => candidate.id !== product.id && candidate.category === product.category)
      .slice(0, 3);
  } catch {
    // Produk serupa bersifat pelengkap; kegagalannya tidak boleh mengarang
    // data atau menggagalkan halaman detail yang sudah berhasil dimuat.
    return [];
  }
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
  const related = await resolveRelated(product);

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
