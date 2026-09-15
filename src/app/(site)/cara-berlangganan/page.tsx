import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, MailCheck, PackageCheck } from "lucide-react";

export const metadata: Metadata = { title: "Cara Berlangganan", description: "Panduan memilih layanan, menyelesaikan pesanan, dan menerima akses Necly." };

const steps = [
  { title: "Pilih layanan", text: "Buka katalog, pilih layanan dan durasi yang sesuai kebutuhan Anda.", Icon: PackageCheck },
  { title: "Isi data pesanan", text: "Masukkan email aktif agar tim dapat mengirim informasi atau undangan akses.", Icon: MailCheck },
  { title: "Selesaikan pembayaran", text: "Pilih metode pembayaran yang tersedia dan selesaikan sebelum batas waktu.", Icon: CreditCard },
  { title: "Akses diproses", text: "Pantau status pesanan. Akses diberikan sesuai skema produk dan kebijakan penyedia.", Icon: CheckCircle2 },
];

const desktopSteps = [
  { title: "Pilih layanan", text: "Pilih produk premium dan paket yang paling sesuai dengan kebutuhanmu.", image: "/design-assets/guide-step-1.png", width: 752, height: 839 },
  { title: "Selesaikan pembayaran", text: "Gunakan metode pembayaran yang tersedia dan selesaikan transaksi dengan aman.", image: "/design-assets/guide-step-2.png", width: 726, height: 811 },
  { title: "Pesanan diproses", text: "Tim Necly akan memverifikasi pembayaran dan menyiapkan akses layananmu.", image: "/design-assets/guide-step-3.png", width: 715, height: 738 },
  { title: "Akses berhasil", text: "Informasi aktivasi dikirim sesuai skema layanan yang telah kamu pilih.", image: "/design-assets/guide-step-4.png", width: 884, height: 778 },
  { title: "Nikmati layanan", text: "Akun premium siap digunakan. Simpan detail pesanan untuk bantuan selanjutnya.", image: "/design-assets/guide-step-5.png", width: 651, height: 700 },
] as const;

export default function SubscriptionGuidePage() {
  return (
    <>
      <div className="protected-mobile-guide">
        <section className="support-hero"><div className="container"><span className="eyebrow">Panduan Necly</span><h1 className="h1">Cara Berlangganan</h1><p>Ikuti empat langkah sederhana dari memilih layanan sampai akses pesanan Anda diproses.</p></div></section>
        <section className="container guide-page"><div className="guide-steps">{steps.map(({ title, text, Icon }, index) => <article className="guide-step" key={title}><span className="guide-number">{index + 1}</span><span className="guide-icon"><Icon size={23} /></span><div><h2>{title}</h2><p>{text}</p></div></article>)}</div><aside className="guide-aside"><h2>Butuh bantuan memilih?</h2><p>Periksa detail harga, durasi, stok, dan ketentuan di setiap halaman layanan sebelum memesan.</p><Link className="button button-primary" href="/products">Lihat Layanan <ArrowRight size={15} /></Link></aside></section>
      </div>
      <div className="figma-desktop-subscription-guide">
        <header><p>Panduan Necly</p><h1>Cara Berlangganan</h1><span>Ikuti langkah sederhana berikut untuk menikmati layanan premium pilihanmu.</span></header>
        <section className="figma-guide-steps">{desktopSteps.map((step, index) => <article className={index % 2 ? "is-reversed" : ""} key={step.title}><div className="figma-guide-step-copy"><i>{index + 1}</i><div><h2>{step.title}</h2><p>{step.text}</p></div></div><Image src={step.image} alt="" width={step.width} height={step.height} unoptimized /></article>)}</section>
        <section className="figma-guide-payments"><h2>Metode Pembayaran</h2><p>Pilih kanal pembayaran yang paling nyaman untukmu.</p><Image src="/design-assets/payment-methods.png" alt="PermataBank, BSI, BCA, BNI, Mandiri, OVO, DANA, ShopeePay, Alfamart, BRI, dan LinkAja" width={2440} height={484} unoptimized /></section>
      </div>
    </>
  );
}
