import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, CreditCard, Headphones, LockKeyhole, ShieldCheck, Tag } from "lucide-react";
import { products } from "@/data/products";
import { services } from "@/data/seed";
import { ProductSearchBar } from "@/components/product-search-bar";

const serviceCount = products.length + services.length;

const stats = [
  ["75.000+", "Pengguna", "purple", "/illustrations/mobile-sharing-hero.svg"],
  ["1.200.850+", "Transaksi", "red", "/illustrations/product-workspace.svg"],
  ["29", "Layanan", "yellow", "/illustrations/mobile-benefits.svg"],
  ["9/10", "Kepuasan", "teal", "/illustrations/product-streaming.svg"],
] as const;

const benefits = [
  ["Harga lebih hemat", "Nikmati layanan pilihan dengan biaya yang lebih terjangkau.", Tag],
  ["Privasi tetap terjaga", "Informasi pesanan dan akses Anda ditangani dengan hati-hati.", LockKeyhole],
  ["Bantuan yang responsif", "Tim kami siap membantu saat Anda membutuhkan informasi.", Headphones],
  ["Layanan tepercaya", "Kami memilih layanan dan proses yang jelas untuk pelanggan.", ShieldCheck],
  ["Pembayaran fleksibel", "Pilih metode pembayaran yang paling nyaman untuk Anda.", CreditCard],
  ["Pengingat pembayaran", "Dapatkan pengingat sebelum masa layanan Anda berakhir.", BellRing],
] as const;

export function CommerceHomeSections() {
  return (
    <>
      <section className="commerce-stats-section">
        <div className="commerce-container">
          <header className="commerce-section-header center"><h2>Premium yang pas untuk kebutuhanmu</h2><p>Pilih layanan favorit, tentukan durasinya, lalu nikmati harga yang lebih ringan bersama.</p></header>
          <div className="commerce-stats-grid">{stats.map(([value, label, tone, image]) => <article className={`commerce-stat-card ${tone}`} key={label}><Image src={image} alt="" width={240} height={136} /><div><strong>{value}</strong><span>{label}</span></div></article>)}</div>
        </div>
      </section>
      <section className="commerce-benefits-section">
        <div className="commerce-container commerce-benefits-layout">
          <div className="commerce-benefits-visual">
            <h2>Semua Benefit Buat Kamu</h2>
            <div className="commerce-benefits-illustration"><Image src="/illustrations/payment-management-reference.png" width={368} height={348} alt="Ilustrasi perangkat digital" /></div>
          </div>
          <div className="commerce-benefit-list">{benefits.map(([title, detail, Icon]) => <article key={title}><span className="commerce-benefit-icon"><Icon size={28} /></span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</div>
        </div>
      </section>
      <section className="commerce-preview-section">
        <div className="commerce-container">
          <header className="commerce-product-heading"><h2>Produk Digital</h2><p>Temukan layanan premium favorit dengan harga patungan yang lebih hemat.</p></header>
          <ProductSearchBar mode="preview" limit={3} />
          <Link className="commerce-all-products-link" href="/products">Lihat Semua Produk <ArrowRight size={18} /></Link>
        </div>
      </section>
      <section className="commerce-quick-trust">
        <div className="commerce-container commerce-quick-trust-grid"><article><strong>{serviceCount}+</strong><span>Pilihan layanan premium</span></article><article><strong>Aman</strong><span>Proses pemesanan terpercaya</span></article><article><strong>24/7</strong><span>Customer support responsif</span></article></div>
      </section>
    </>
  );
}
