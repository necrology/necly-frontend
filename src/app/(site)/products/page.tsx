import type { Metadata } from "next";
import { ProductsClient } from "./products-client";

export const metadata: Metadata = {
  title: "Jelajahi langganan digital",
  description: "Temukan slot anggota dan kursi tim untuk streaming, produktivitas, kreatif, edukasi, dan keamanan di Necly Services.",
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return (
    <>
      <header className="page-hero">
        <div className="container page-hero-row">
          <div><span className="eyebrow">Jelajahi katalog</span><h1 className="h1" style={{ marginTop: 14 }}>Slot langganan <br />siap pakai, transparan.</h1></div>
          <p className="lede" style={{ maxWidth: 410, fontSize: 14 }}>Bandingkan manfaat, durasi, stok slot, dan syarat & ketentuan di semua produk yang terverifikasi.</p>
        </div>
      </header>
      <ProductsClient initialCategory={category} />
    </>
  );
}