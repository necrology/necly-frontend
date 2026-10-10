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
          <div className="commerce-catalog-hero-art"><Image src="/design-assets/homepage-hero.png" alt="Ilustrasi orang-orang berbagi layanan digital" width={630} height={424} sizes="(min-width: 768px) 480px, 260px" preload unoptimized /></div>
        </div>
      </section>
      <main className="commerce-catalog-page"><div className="commerce-container"><ProductSearchBar /></div></main>
    </>
  );
}
