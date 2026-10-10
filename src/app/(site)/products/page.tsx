import type { Metadata } from "next";
import { getImageProps } from "next/image";
import { ProductSearchBar } from "@/components/product-search-bar";

export const metadata: Metadata = {
  title: "Produk Digital",
  description: "Temukan berbagai layanan premium favorit dengan harga lebih hemat dan terpercaya.",
};

function CatalogHeroArtwork() {
  const common = { alt: "Ilustrasi orang-orang berbagi layanan digital", sizes: "(min-width: 768px) 480px, 260px" };
  const { props: { srcSet: desktop } } = getImageProps({
    ...common,
    src: "/design-assets/homepage-hero.png",
    width: 630,
    height: 424,
    quality: 75,
  });
  const { props: { srcSet: mobile, alt, ...image } } = getImageProps({
    ...common,
    src: "/illustrations/mobile-sharing-hero.svg",
    width: 720,
    height: 520,
  });

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop} />
      <source media="(max-width: 767px)" srcSet={mobile} />
      <img {...image} alt={alt} fetchPriority="high" />
    </picture>
  );
}

export default function ProductsPage() {
  return (
    <>
      <section className="commerce-catalog-hero">
        <div className="commerce-container commerce-catalog-hero-inner">
          <div><h1>Produk <span>Digital</span></h1><p>Pilih layanan untuk hiburan, produktivitas, dan kebutuhan sehari-hari dalam satu tempat.</p></div>
          <div className="commerce-catalog-hero-art"><CatalogHeroArtwork /><span>Pilihan praktis<br />untuk kebutuhan<br />digital Anda</span></div>
        </div>
      </section>
      <main className="commerce-catalog-page"><div className="commerce-container"><ProductSearchBar /></div></main>
    </>
  );
}
