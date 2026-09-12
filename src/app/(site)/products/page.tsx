import type { Metadata } from "next";
import { Headphones, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { ProductsClient } from "./products-client";

export const metadata: Metadata = {
  title: "Produk digital",
  description: "Temukan layanan premium dengan harga lebih hemat dan terpercaya di Necly Services.",
};

const benefits = [
  { title: "Produk 100% Original", detail: "Aktivasi melalui akses resmi", Icon: ShieldCheck },
  { title: "Layanan Pelanggan 24/7", detail: "Tim siap membantu kapan saja", Icon: Headphones },
  { title: "Pembayaran Aman", detail: "Diproses oleh mitra tepercaya", Icon: LockKeyhole },
  { title: "Harga Lebih Hemat", detail: "Pilihan paket sesuai kebutuhan", Icon: Sparkles },
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return (
    <>
      <section className="catalog-hero">
        <div className="container catalog-hero-content">
          <div>
            <p className="catalog-kicker">NECLY SERVICES</p>
            <h1>Produk <span>Digital</span></h1>
            <p>Temukan berbagai layanan premium favorit kamu<br className="desktop-only" /> dengan harga lebih hemat dan terpercaya.</p>
          </div>
          <div className="catalog-hero-illustration" aria-hidden="true"><span>★</span><b>Lebih hemat,<br />lebih mudah.</b></div>
        </div>
      </section>
      <ProductsClient initialCategory={category} />
      <section className="container catalog-benefit-strip" aria-label="Keunggulan berbelanja di Necly">
        {benefits.map(({ title, detail, Icon }) => <div className="catalog-benefit" key={title}><Icon size={31} /><div><strong>{title}</strong><span>{detail}</span></div></div>)}
      </section>
    </>
  );
}
