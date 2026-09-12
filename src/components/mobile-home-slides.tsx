"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const slides = [
  {
    image: "/illustrations/mobile-sharing-hero.svg",
    title: <>Mau Premium?<br />Patungan Aja!</>,
    description: "Temukan berbagai pilihan layanan premium dengan harga yang lebih bersahabat.",
    action: "Lihat Layanan",
    href: "/products",
  },
  {
    image: "/illustrations/mobile-benefits.svg",
    title: <>Lebih Hemat,<br />Tetap Nyaman.</>,
    description: "Pilih durasi yang kamu perlukan dan terima akses melalui jalur yang sesuai paket.",
    action: "Jelajahi Produk",
    href: "/products",
  },
  {
    image: "/illustrations/necly-hero-sharing.svg",
    title: <>Pilih, Pesan,<br />Nikmati Akses.</>,
    description: "Lihat detail produk, pilih paket, lalu lanjutkan pesanan dengan mudah.",
    action: "Mulai Sekarang",
    href: "/products",
  },
];

export function MobileHomeSlides() {
  const [active, setActive] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const slide = slides[active];
  const move = (next: number) => setActive((next + slides.length) % slides.length);

  return (
    <section className="mobile-home-slides" aria-label="Pengantar Necly Services">
      <div className="mobile-slide-track" onTouchStart={(event) => setStartX(event.touches[0].clientX)} onTouchEnd={(event) => { if (startX === null) return; const delta = event.changedTouches[0].clientX - startX; if (Math.abs(delta) > 45) move(delta < 0 ? active + 1 : active - 1); setStartX(null); }}>
        <div className="mobile-slide-image"><Image src={slide.image} alt="" width={720} height={520} priority /></div>
        <div className="mobile-slide-copy"><h1>{slide.title}</h1><p>{slide.description}</p></div>
        <Link className="mobile-slide-cta" href={slide.href}>{slide.action}</Link>
      </div>
      <div className="mobile-slide-dots" role="tablist" aria-label="Pilih slide">
        {slides.map((item, index) => <button key={item.action} className={index === active ? "active" : ""} type="button" onClick={() => setActive(index)} aria-label={`Slide ${index + 1}`} aria-selected={index === active} role="tab" />)}
      </div>
    </section>
  );
}
