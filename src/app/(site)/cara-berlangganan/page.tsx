import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, MailCheck, PackageCheck } from "lucide-react";

export const metadata: Metadata = { title: "Cara Berlangganan", description: "Panduan memilih layanan, menyelesaikan pesanan, dan menerima akses Necly." };

const steps = [
  { title: "Pilih layanan", text: "Buka katalog, pilih layanan dan durasi yang sesuai kebutuhan Anda.", Icon: PackageCheck },
  { title: "Isi data pesanan", text: "Masukkan email aktif agar tim dapat mengirim informasi atau undangan akses.", Icon: MailCheck },
  { title: "Selesaikan pembayaran", text: "Pilih metode pembayaran yang tersedia dan selesaikan sebelum batas waktu.", Icon: CreditCard },
  { title: "Akses diproses", text: "Pantau status pesanan. Akses diberikan sesuai skema produk dan kebijakan penyedia.", Icon: CheckCircle2 },
];

export default function SubscriptionGuidePage() {
  return <><section className="support-hero"><div className="container"><span className="eyebrow">Panduan Necly</span><h1 className="h1">Cara Berlangganan</h1><p>Ikuti empat langkah sederhana dari memilih layanan sampai akses pesanan Anda diproses.</p></div></section><section className="container guide-page"><div className="guide-steps">{steps.map(({ title, text, Icon }, index) => <article className="guide-step" key={title}><span className="guide-number">{index + 1}</span><span className="guide-icon"><Icon size={23} /></span><div><h2>{title}</h2><p>{text}</p></div></article>)}</div><aside className="guide-aside"><h2>Butuh bantuan memilih?</h2><p>Periksa detail harga, durasi, stok, dan ketentuan di setiap halaman layanan sebelum memesan.</p><Link className="button button-primary" href="/products">Lihat Layanan <ArrowRight size={15} /></Link></aside></section></>;
}
