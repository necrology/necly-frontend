import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ", description: "Pertanyaan umum seputar layanan, pembayaran, dan akses Necly." };

const questions = [
  ["Bagaimana cara memesan layanan?", "Pilih layanan dan durasi di katalog, lanjutkan melalui detail produk, lalu selesaikan data dan pembayaran pesanan."],
  ["Kapan akses saya diproses?", "Waktu proses mengikuti informasi pada produk dan status pembayaran. Pantau halaman pesanan untuk pembaruan status."],
  ["Apakah saya perlu mengirim kata sandi?", "Tidak. Jangan pernah membagikan kata sandi, OTP, atau kredensial rahasia. Data yang diperlukan hanya digunakan sesuai proses layanan."],
  ["Metode pembayaran apa yang tersedia?", "Metode yang dapat digunakan akan tampil saat tahap pembayaran dan dapat berbeda menurut durasi atau jenis produk."],
  ["Bagaimana jika pembayaran atau akses bermasalah?", "Gunakan halaman Laporan Kendala dan sertakan nomor pesanan agar tim dapat memeriksa kasus Anda."],
];

export default function FaqPage() {
  return <><section className="support-hero"><div className="container"><span className="eyebrow">Pusat bantuan</span><h1 className="h1">Pertanyaan yang sering ditanyakan</h1><p>Informasi ringkas tentang layanan, pesanan, pembayaran, dan akses Anda.</p></div></section><section className="container faq-page"><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section></>;
}
