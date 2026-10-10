import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, ChevronDown, CreditCard, Headphones, LockKeyhole, ShieldCheck, Tag } from "lucide-react";
import { faqQuestions, subscriptionSteps } from "@/data/guide";
import { ProductSearchBar } from "@/components/product-search-bar";

const quickTrust = [
  ["17+", "Pilihan layanan premium"],
  ["Aman", "Proses pemesanan terpercaya"],
  ["24/7", "Customer support responsif"],
] as const;

const stats = [
  ["75.000+", "Pengguna", "purple", "/design-assets/stat-users.png"],
  ["1.200.850+", "Transaksi", "red", "/design-assets/stat-transactions.png"],
  ["29", "Layanan", "yellow", "/design-assets/stat-services.png"],
  ["9/10", "Kepuasan", "teal", "/design-assets/stat-satisfaction.png"],
] as const;

const benefits = [
  ["Harga lebih hemat", "Diskon Hingga 70%", "Nikmati layanan pilihan dengan biaya yang lebih terjangkau.", Tag],
  ["Privasi tetap terjaga", "Privasi Kamu Tetap Aman", "Informasi pesanan dan akses Anda ditangani dengan hati-hati.", LockKeyhole],
  ["Bantuan yang responsif", "Layanan Pelanggan Cepat Tanggap", "Tim kami siap membantu saat Anda membutuhkan informasi.", Headphones],
  ["Layanan tepercaya", "Akses Legal dan Terpercaya", "Kami memilih layanan dan proses yang jelas untuk pelanggan.", ShieldCheck],
  ["Pembayaran fleksibel", "Pilihan Metode Pembayaran Lengkap", "Pilih metode pembayaran yang paling nyaman untuk Anda.", CreditCard],
  ["Pengingat pembayaran", "Notifikasi Pengingat Pembayaran", "Dapatkan pengingat sebelum masa layanan Anda berakhir.", BellRing],
] as const;

export function CommerceHomeSections() {
  return (
    <>
      <section className="commerce-stats-section">
        <div className="commerce-container">
          <header className="commerce-section-header center"><h2><span className="commerce-mobile-copy">Saatnya Upgrade Bareng!</span><span className="figma-desktop-copy">Saatnya Upgrade Bareng!</span></h2><p><span className="commerce-mobile-copy">Yuk Gabung sekarang!, patungan lebih hemat, dan nikmati akses premium dengan aman dan legal.</span><span className="figma-desktop-copy">Yuk Gabung sekarang!, patungan lebih hemat, dan nikmati<br />akses premium dengan aman dan legal.</span></p></header>
          <div className="commerce-stats-grid">{stats.map(([value, label, tone, image]) => <article className={`commerce-stat-card ${tone}`} key={label}><Image className="commerce-stat-art" src={image} alt="" width={664} height={490} loading="eager" unoptimized /><div><strong>{value}</strong><span>{label}</span></div></article>)}</div>
        </div>
      </section>
      <section className="commerce-benefits-section">
        <div className="commerce-container commerce-benefits-layout">
          <div className="commerce-benefits-visual">
            <h2><span className="commerce-mobile-copy">Semua Benefit Buat Kamu</span><span className="figma-desktop-copy">Manfaat yang Kamu Dapat</span></h2>
            <div className="commerce-benefits-illustration"><Image className="commerce-benefits-art" src="/design-assets/home-benefits.png" width={1404} height={1358} alt="Ilustrasi manfaat berlangganan bersama" unoptimized /></div>
          </div>
          <div className="commerce-benefit-list">{benefits.map(([title, desktopTitle, detail, Icon]) => <article key={title}><span className="commerce-benefit-icon"><Icon size={28} /></span><div><h3><span className="commerce-mobile-copy">{title}</span><span className="figma-desktop-copy">{desktopTitle}</span></h3><p>{detail}</p></div></article>)}</div>
        </div>
      </section>
      <section className="commerce-preview-section">
        <div className="commerce-container">
          <header className="commerce-product-heading"><h2>Produk Digital</h2><p>Temukan layanan premium favorit dengan harga patungan yang lebih hemat.</p></header>
          <ProductSearchBar mode="preview" limit={4} />
          <Link className="commerce-all-products-link" href="/products">Lihat Semua Produk <ArrowRight size={18} /></Link>
        </div>
      </section>
      {/* Poin 18: Cara Berlangganan & FAQ juga tampil di beranda, setelah bagian produk. */}
      <section className="commerce-guide-section">
        <div className="commerce-container">
          <header className="commerce-section-header center"><h2>Cara Berlangganan</h2><p>Ikuti langkah sederhana berikut untuk menikmati layanan premium pilihanmu.</p></header>
          <div className="commerce-guide-steps">{subscriptionSteps.map(({ title, text, Icon }, index) => <article key={title}><span className="commerce-guide-number">{index + 1}</span><span className="commerce-guide-icon"><Icon size={22} /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
          <Link className="commerce-all-products-link" href="/cara-berlangganan">Baca Panduan Lengkap <ArrowRight size={18} /></Link>
        </div>
      </section>
      <section className="commerce-faq-section">
        <div className="commerce-container">
          <header className="commerce-section-header center"><h2>Pertanyaan yang Sering Ditanyakan</h2><p>Informasi ringkas tentang layanan, pesanan, pembayaran, dan akses Anda.</p></header>
          <div className="commerce-faq-list">{faqQuestions.map(({ question, answer, action }) => <details key={question}><summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary><p>{answer}</p>{action && <Link className="faq-action" href={action.href}>{action.label}</Link>}</details>)}</div>
        </div>
      </section>
      <section className="commerce-quick-trust">
        <div className="commerce-container commerce-quick-trust-grid">{quickTrust.map(([value, label]) => <article key={label}><div className="commerce-quick-trust-copy"><strong>{value}</strong><span>{label}</span></div><span className="commerce-quick-trust-spark" aria-hidden="true"><i /><i /><i /></span></article>)}</div>
      </section>
    </>
  );
}
