import type { Metadata } from "next";
import Image from "next/image";
import { ProductSearchBar } from "@/components/product-search-bar";

export const metadata: Metadata = {
  title: "Produk Digital",
  description: "Temukan berbagai layanan premium favorit dengan harga lebih hemat dan terpercaya.",
};

export default function ProductsPage() {
  return (
    <>
      <section className="commerce-catalog-hero">
        <div className="commerce-container commerce-catalog-hero-inner">
          <div><h1>Produk <span>Digital</span></h1><p>Pilih layanan untuk hiburan, produktivitas, dan kebutuhan sehari-hari dalam satu tempat.</p></div>
          <div className="commerce-catalog-hero-art"><Image src="/illustrations/product-workspace.svg" width={480} height={360} alt="Ilustrasi produk digital" /><span>Pilihan praktis<br />untuk kebutuhan<br />digital Anda</span></div>
        </div>
      </section>
      <main className="commerce-catalog-page"><div className="commerce-container"><ProductSearchBar /></div></main>
    </>
  );
}
