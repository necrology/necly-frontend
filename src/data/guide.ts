import { CheckCircle2, CreditCard, MailCheck, PackageCheck } from "lucide-react";

// Dipakai bersama oleh halaman /cara-berlangganan dan section ringkasannya di beranda.
export const subscriptionSteps = [
  { title: "Pilih layanan", text: "Buka katalog, pilih layanan dan durasi yang sesuai kebutuhan Anda.", Icon: PackageCheck },
  { title: "Isi data pesanan", text: "Masukkan email aktif agar tim dapat mengirim informasi atau undangan akses.", Icon: MailCheck },
  { title: "Selesaikan pembayaran", text: "Pilih metode pembayaran yang tersedia dan selesaikan sebelum batas waktu.", Icon: CreditCard },
  { title: "Akses diproses", text: "Pantau status pesanan. Akses diberikan sesuai skema produk dan kebijakan penyedia.", Icon: CheckCircle2 },
];

// Dipakai bersama oleh halaman /faq dan section FAQ di beranda.
// `action` menambahkan tombol pintasan pada poin yang butuh (QA baris 53 & 54).
export type FaqItem = {
  question: string;
  answer: string;
  action?: { label: string; href: string };
};

export const faqQuestions: FaqItem[] = [
  {
    question: "Bagaimana cara memesan layanan?",
    answer: "Pilih layanan dan durasi di katalog, lanjutkan melalui detail produk, lalu selesaikan data dan pembayaran pesanan.",
    action: { label: "Layanan", href: "/products" },
  },
  {
    question: "Kapan akses saya diproses?",
    answer: "Waktu proses mengikuti informasi pada produk dan status pembayaran. Pantau halaman pesanan untuk pembaruan status.",
  },
  {
    question: "Apakah saya perlu mengirim kata sandi?",
    answer: "Tidak. Jangan pernah membagikan kata sandi, OTP, atau kredensial rahasia. Data yang diperlukan hanya digunakan sesuai proses layanan.",
  },
  {
    question: "Metode pembayaran apa yang tersedia?",
    answer: "Metode yang dapat digunakan akan tampil saat tahap pembayaran dan dapat berbeda menurut durasi atau jenis produk.",
  },
  {
    question: "Bagaimana jika pembayaran atau akses bermasalah?",
    answer: "Gunakan halaman Laporan Kendala dan sertakan nomor pesanan agar tim dapat memeriksa kasus Anda.",
    action: { label: "Laporan Kendala", href: "/laporan-kendala" },
  },
];
