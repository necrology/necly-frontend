import Image from "next/image";
import { BadgeCheck, BellRing, CreditCard, Headphones, LockKeyhole, ShieldCheck } from "lucide-react";

const stats = [
  ["75.000+", "Pengguna", "purple"],
  ["1.200.850+", "Transaksi", "coral"],
  ["29", "Layanan", "gold"],
  ["9/10", "Kepuasan", "teal"],
] as const;
const benefits = [
  ["Diskon Hingga 70%", BadgeCheck],
  ["Privasi Anda Tetap Aman", LockKeyhole],
  ["Layanan Pelanggan Cepat Tanggap", Headphones],
  ["Akses Legal dan Terpercaya", ShieldCheck],
  ["Pilihan Metode Pembayaran Lengkap", CreditCard],
  ["Notifikasi Pengingat Pembayaran", BellRing],
] as const;

export function HomeTrustSections() {
  return <>
    <section className="home-stats-section"><div className="container"><div className="home-section-heading"><span>BERSAMA LEBIH HEMAT</span><h2>Saatnya Upgrade Bareng!</h2><p>Yuk gabung sekarang, patungan lebih hemat, dan nikmati akses premium dengan aman dan legal.</p></div><div className="home-stats-grid">{stats.map(([value, label, tone]) => <article className={`home-stat-card ${tone}`} key={label}><strong>{value}</strong><span>{label}</span></article>)}</div></div></section>
    <section className="home-benefit-section"><div className="container home-benefit-layout"><div className="home-benefit-art"><Image src="/illustrations/payment-management-reference.png" width={184} height={174} alt="Ilustrasi pembayaran digital" /></div><div><div className="home-section-heading left"><span>KENAPA NECLY</span><h2>Semua Benefit Buat Kamu</h2><p>Berlangganan jadi lebih praktis, hemat, dan tetap nyaman.</p></div><div className="home-benefit-list">{benefits.map(([label, Icon]) => <div key={label}><span><Icon size={18} /></span><strong>{label}</strong></div>)}</div></div></div></section>
  </>;
}
