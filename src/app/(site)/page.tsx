import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
            <Link className="commerce-hero-cta" href="/products">Lihat Layanan <ArrowRight size={22} /></Link>
          </div>
          <div className="commerce-home-hero-art"><Image src="/design-assets/homepage-hero.png" alt="Orang-orang berbagi layanan premium" width={630} height={424} priority unoptimized /><span>Lebih Hemat<br />Lebih Seru<br />Bersama!</span></div>
        </div>
      </section>
      <CommerceHomeSections />
    </>
  );
}
