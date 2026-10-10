import type { Metadata } from "next";
import { TestimonialsClient } from "@/components/testimonials-client";

export const metadata: Metadata = { title: "Testimoni", description: "Cerita dan penilaian pelanggan Necly Services setelah menggunakan layanan kami." };

// Daftar testimoni diambil dari `GET /api/v1/public/testimonials`, yang hanya
// mengembalikan ulasan berstatus approved dan menyembunyikan identitas akun
// pemberi ulasan.
export default function TestimoniPage() {
  return (
    <>
      <section className="support-hero"><div className="container"><span className="eyebrow">Testimoni</span><h1 className="h1">Cerita dari pelanggan Necly</h1><p>Penilaian yang dibagikan pelanggan setelah menikmati layanan premium bersama Necly Services.</p></div></section>
      <section className="container testimonials-page">
        <TestimonialsClient />
      </section>
    </>
  );
}
