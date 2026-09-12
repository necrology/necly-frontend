import type { Metadata } from "next";
import { Check, CheckCircle2, PackageCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductOrderPanel } from "@/components/product-order-panel";
import { ServiceCard } from "@/components/service-card";
import { getRelatedServices, getService, services, type SubscriptionProduct } from "@/data/seed";
import { catalogApi, DEMO_MODE } from "@/lib/api";
import { formatIDR } from "@/lib/money";
import type { ProductCategory } from "@/lib/types";

export function generateStaticParams() {
  return services.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getService(slug);
  if (!product) return { title: "Produk tidak ditemukan" };
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: `${product.name} | Necly Services`, description: product.summary, type: "website", images: ["/brand/necly-reference.jpg"] },
  };
}

export async function fetchProductFromApi(slug: string): Promise<SubscriptionProduct | null> {
  if (DEMO_MODE) return null;
  try {
    const res = await catalogApi.getProduct(slug);
    const apiProduct = res as unknown as { id: string; name: string; slug: string; description: string; category: { name: string; slug: string }; prices: Array<{ id: string; amount: number; currency: string; active: boolean; duration?: { name: string; days: number } }>; active: boolean; image_url?: string };
    // Map API product to SubscriptionProduct shape for rendering
    const priceOptions = (apiProduct.prices || [])
      .filter((p) => p.active)
      .map((p) => ({
        id: p.id,
        label: p.duration?.name ?? `${p.duration?.days ?? 30} hari`,
        duration: p.duration?.name ?? `${p.duration?.days ?? 30} hari`,
        days: p.duration?.days ?? 30,
        price: p.amount,
      }));
    return {
      id: apiProduct.id,
      slug: apiProduct.slug,
      name: apiProduct.name,
      eyebrow: apiProduct.category?.name ?? "Digital",
      category: (apiProduct.category?.name ?? "Digital") as ProductCategory,
      price: priceOptions[0]?.price ?? 0,
      stock: 1,
      duration: priceOptions[0]?.duration ?? "30 hari",
      summary: apiProduct.description,
      description: apiProduct.description,
      accessType: "Undangan anggota",
      benefits: ["Aktivasi resmi", "Profil pribadi terpisah", "Dukungan aktivasi"],
      activationSteps: [
        { title: "Pilih durasi", description: "Tentukan masa akses sesuai kebutuhan." },
        { title: "Terima undangan", description: "Undangan anggota dikirim ke email pesanan." },
        { title: "Aktifkan profil", description: "Gunakan akun pribadi selama masa akses." },
      ],
      operator: { name: "Tim Necly", role: "Pengelola akses", initials: "N" },
      accent: "indigo",
      featured: false,
      priceOptions,
      termsNote: "Akses diberikan melalui undangan anggota atau kursi resmi.",
    };
  } catch {
    return null;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const seedProduct = getService(slug);
  let productData: SubscriptionProduct | null = seedProduct ?? null;
  if (!productData) {
    productData = await fetchProductFromApi(slug);
  }
  if (!productData) {
    notFound();
  }
  // notFound() throws, so productData is guaranteed non-null here
  const product = productData!;
  const related = getRelatedServices(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productData.name,
    description: productData.summary,
    brand: { "@type": "Brand", name: "Necly Services" },
    category: productData.category,
    sku: productData.id,
    offers: productData.priceOptions.map((opt) => ({
      "@type": "Offer",
      priceCurrency: "IDR",
      price: opt.price,
      availability: productData.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `/products/${productData.slug}`,
      description: `Akses ${opt.label} (${opt.duration})`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container page-hero" style={{ paddingBottom: 28 }}>
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>/</span><Link href="/products">Produk</Link><span>/</span><span>{productData.name}</span></nav>
      </div>
      <div className="container product-layout">
        <article className="product-main">
          <header className="product-title-block">
            <div className="product-kicker"><span className="badge status-info">{productData.category}</span></div>
            <span className="eyebrow">{productData.eyebrow}</span>
            <h1 className="h1">{productData.name}</h1>
            <p className="lede">{productData.summary}</p>
          </header>
          <div className="product-info-strip">
            <div className="product-info"><span className="muted small">Jenis akses</span><strong><CheckCircle2 size={13} style={{ display: "inline", marginRight: 7 }} />{productData.accessType}</strong></div>
            <div className="product-info"><span className="muted small">Ketersediaan</span><strong><PackageCheck size={13} style={{ display: "inline", marginRight: 7 }} />{productData.stock > 0 ? `${productData.stock} slot` : "Daftar tunggu"}</strong></div>
          </div>
          <section className="content-block"><h2>Manfaat layanan</h2><ul className="check-list">{productData.benefits.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul></section>
          <section className="content-block"><h2>Deskripsi</h2><p>{productData.description}</p></section>
          <section className="content-block"><h2>Opsi durasi & harga</h2><div className="detail-process">{productData.priceOptions.map((opt, index) => <div className="detail-step" key={opt.id}><span className="step-number">{String(index + 1).padStart(2, "0")}</span><div><h3 className="h3">{opt.label} — {formatIDR(opt.price)}</h3><p style={{ margin: "4px 0 0", fontSize: 12 }}>{opt.duration}</p></div></div>)}</div></section>
          <section className="content-block"><h2>Cara aktivasi</h2><div className="detail-process">{productData.activationSteps.map((step, index) => <div className="detail-step" key={step.title}><span className="step-number">{String(index + 1).padStart(2, "0")}</span><div><h3 className="h3">{step.title}</h3><p style={{ margin: "4px 0 0", fontSize: 12 }}>{step.description}</p></div></div>)}</div></section>
          <section className="content-block"><h2>Catatan syarat & ketentuan</h2><p className="muted" style={{ fontSize: 13 }}>{productData.termsNote}</p></section>
        </article>
        <ProductOrderPanel product={productData} />
      </div>
      {related.length > 0 && <section className="section section-rule"><div className="container"><div className="section-heading"><div><span className="eyebrow">Jelajahi juga</span><h2 className="h2" style={{ marginTop: 10 }}>Produk {productData.category.toLowerCase()} lainnya.</h2></div></div><div className="service-grid">{related.map((item) => <ServiceCard product={item} key={item.id} />)}</div></div></section>}
    </>
  );
}