import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";

export const metadata: Metadata = { title: "Testimoni", description: "Cerita dan penilaian pelanggan Necly Services setelah menggunakan layanan kami." };

// Kerangka halaman (permintaan QA poin 16). Data testimoni baru bisa tampil
// setelah endpoint `GET /api/v1/testimonials` tersambung di backend, jadi
// halaman ini sengaja hanya menampilkan empty state — bukan contoh karangan.
export default function TestimoniPage() {
  return (
    <>
      <section className="support-hero"><div className="container"><span className="eyebrow">Testimoni</span><h1 className="h1">Cerita dari pelanggan Necly</h1><p>Penilaian yang dibagikan pelanggan setelah menikmati layanan premium bersama Necly Services.</p></div></section>
      <section className="container testimonials-page">
        <div className="testimonials-empty">
          <span className="testimonials-empty-icon"><MessageSquareQuote size={26} /></span>
          <h2>Belum ada testimoni yang ditampilkan</h2>
          <p>Testimoni akan muncul di halaman ini setelah fitur penilaian tersambung. Sementara itu, Anda dapat melihat pilihan layanan atau menyampaikan pertanyaan langsung ke tim kami.</p>
          <div className="testimonials-empty-actions">
            <Link className="button button-primary" href="/products">Lihat Layanan</Link>
            <Link className="button button-secondary" href="/laporan-kendala">Lapor Kendala</Link>
          </div>
        </div>
      </section>
    </>
  );
}
