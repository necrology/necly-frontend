import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Tentang", description: "Mengapa Necly menyediakan akses akun langganan bersama agar biaya lebih hemat." };

const principles = [
  ["Undangan resmi, bukan kata sandi", "Aktivasi lewat tautan anggota atau kursi tim yang sah. Profil Anda tetap terpisah dan privat."],
  ["Stok slot yang terlihat", "Setiap produk menampilkan ketersediaan slot real-time sebelum Anda memesan."],
  ["Catatan syarat & ketentuan jelas", "Setiap produk menyertakan catatan yang menjelaskan batas hak akses sesuai kebijakan penyedia."],
  ["Tim Akses yang bertanggung jawab", "Tim Akses tetap terlibat dari undangan hingga slot aktif—tanpa perantara anonim."],
];

export default function AboutPage() {
  return (
    <>
      <section className="about-hero"><div className="container"><span className="eyebrow">Tentang Necly Services</span><h1 className="about-statement">Akses langganan digital lebih hemat saat slot akun <span className="brand-text">dipakai bersama</span> secara transparan.</h1></div></section>
      <section className="section section-rule"><div className="container about-grid"><div><span className="eyebrow">Mengapa kami ada</span></div><div><h2 className="h2">Langganan premium lebih terjangkau melalui pembagian slot akun yang sah.</h2><p className="lede" style={{ marginTop: 24 }}>Necly menyediakan akses dan slot akun langganan premium yang dapat dipakai bersama. Pelanggan mendapatkan biaya yang jauh lebih hemat dengan profil pribadi terpisah.</p><p className="muted" style={{ maxWidth: 690, marginTop: 22 }}>Akses diberikan melalui undangan anggota resmi atau kursi tim berlisensi langsung ke akun pribadi Anda tanpa perlu berbagi kata sandi.</p></div></div></section>
      <section className="section"><div className="container about-grid"><div><span className="eyebrow">Prinsip kami</span><p className="muted small" style={{ marginTop: 16 }}>Aturan yang kami gunakan untuk memastikan kenyamanan dan keamanan akses Anda.</p></div><div className="principle-list">{principles.map(([title, text], index) => <article className="principle" key={title}><span className="principle-number">{String(index + 1).padStart(2, "0")}</span><div><h3 className="h3">{title}</h3><p className="muted" style={{ margin: "8px 0 0" }}>{text}</p></div></article>)}</div></div></section>
      <section className="section section-rule"><div className="container quote-panel card"><div className="quote-aside"><Image src="/brand/necly-services-logo.svg" width={170} height={170} alt="Logo resmi Necly Services" /></div><div className="quote-copy"><span className="eyebrow" style={{ color: "#68cbf5" }}>Alur akses hemat</span><h2 className="h2" style={{ color: "white" }}>Pilih. Bayar. Aktifkan.</h2><div style={{ display: "grid", gap: 12, color: "#bdc9d6", fontSize: 13 }}><span><CheckCircle2 size={15} style={{ display: "inline", marginRight: 9, color: "#68cbf5" }} />Pilih durasi slot akun langganan yang dibutuhkan.</span><span><CheckCircle2 size={15} style={{ display: "inline", marginRight: 9, color: "#68cbf5" }} />Selesaikan pembayaran dengan metode yang aman.</span><span><CheckCircle2 size={15} style={{ display: "inline", marginRight: 9, color: "#68cbf5" }} />Terima undangan resmi di email pribadi Anda.</span></div></div></div></section>
      <section className="section-sm"><div className="container cta-band"><div><span className="eyebrow">Mulai hemat sekarang</span><h2 className="h2" style={{ marginTop: 10 }}>Jelajahi slot langganan premium kami.</h2></div><Link className="button button-primary" href="/products">Jelajahi produk <ArrowRight size={15} /></Link></div></section>
    </>
  );
}