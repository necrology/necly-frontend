import Image from "next/image";
import Link from "next/link";
import { CommerceHomeSections } from "@/components/commerce-home-sections";

export default function HomePage() {
  return (
    <>
      <section className="commerce-home-hero">
        <div className="figma-desktop-home-hero" aria-label="Patungan layanan premium">
          <div className="figma-desktop-hero-copy">
            <h1>Mau Premium?<br /><span>Patungan Aja</span>,<br />Lebih <span>Hemat</span>!</h1>
            <p>Temukan berbagai pilihan akun sharing dengan harga yang lebih bersahabat.</p>
            <Link className="figma-desktop-login" href="/login">Log In</Link>
          </div>
          <Image className="figma-desktop-hero-art" src="/design-assets/homepage-hero.png" alt="Orang-orang berbagi layanan premium" width={630} height={424} preload unoptimized />
        </div>
        <div className="commerce-container commerce-home-hero-inner">
          <div className="commerce-home-hero-copy">
            <h1>Langganan premium,<br /><span>lebih ringan bersama.</span></h1>
            <p>Temukan pilihan layanan digital untuk hiburan, kerja, dan kebutuhan sehari-hari dengan proses yang jelas.</p>
            {/* Baris 9: ikon panah kanan dihapus, teks tombol dibuat putih lewat CSS. */}
            <Link className="commerce-hero-cta" href="/products">Lihat Layanan</Link>
          </div>
          {/* Baris 9: teks "Lebih Hemat Lebih Seru Bersama" dihapus karena menutupi animasi. */}
          <div className="commerce-home-hero-art"><Image src="/design-assets/homepage-hero-mobile.png" alt="Orang-orang berbagi layanan premium" width={630} height={636} priority unoptimized /></div>
        </div>
      </section>
      <CommerceHomeSections />
    </>
  );
}
