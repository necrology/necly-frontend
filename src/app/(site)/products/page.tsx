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
          <div><h1>Produk <span>Digital</span></h1><p>Temukan berbagai layanan premium favorit kamu<br />dengan harga lebih hemat dan terpercaya.</p></div>
          <div className="commerce-catalog-hero-art"><Image src="/illustrations/product-workspace.svg" width={480} height={360} alt="Ilustrasi produk digital" /><span>Hiburan<br />Tanpa Batas<br />Lebih Hemat!</span></div>
        </div>
      </section>
      <main className="commerce-catalog-page"><div className="commerce-container"><ProductSearchBar /></div></main>
    </>
  );
}
