"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquareQuote, Star } from "lucide-react";
import { DEMO_MODE, testimonialsApi, type ApiTestimonial } from "@/lib/api";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

// The backend only ever returns reviews an admin has approved, and strips the
// reviewer's email before serialising — so anything rendered here is already
// cleared for publication.
export function TestimonialsClient() {
  // Demo mode has no API to call, so start from the empty state instead of
  // setting it inside the effect.
  const [testimonials, setTestimonials] = useState<ApiTestimonial[] | null>(DEMO_MODE ? [] : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) return;

    let cancelled = false;
    testimonialsApi
      .list({ per_page: 24 })
      .then((response) => {
        if (!cancelled) setTestimonials(response.testimonials ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Testimoni belum dapat dimuat dari server. Silakan muat ulang halaman ini.");
        setTestimonials([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (testimonials === null) {
    return (
      <div className="testimonials-status" role="status" aria-live="polite">
        <span className="skeleton" style={{ width: 180, height: 18 }} />
        <span className="skeleton" style={{ width: 280, height: 14 }} />
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <>
        {error && <p className="testimonials-warning" role="alert">{error}</p>}
        <div className="testimonials-empty">
          <span className="testimonials-empty-icon"><MessageSquareQuote size={26} /></span>
          <h2>Belum ada testimoni yang ditampilkan</h2>
          <p>Testimoni yang sudah disetujui akan muncul di halaman ini. Sementara itu, Anda dapat melihat pilihan layanan atau menyampaikan pertanyaan langsung ke tim kami.</p>
          <div className="testimonials-empty-actions">
            <Link className="button button-primary" href="/products">Lihat Layanan</Link>
            <Link className="button button-secondary" href="/laporan-kendala">Lapor Kendala</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {error && <p className="testimonials-warning" role="alert">{error}</p>}
      <ul className="testimonials-grid">
        {testimonials.map((testimonial) => {
          const published = formatDate(testimonial.created_at);
          return (
            <li className="testimonial-card" key={testimonial.id}>
              <div
                className="testimonial-stars"
                role="img"
                aria-label={`Penilaian ${testimonial.rating} dari 5`}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    size={14}
                    aria-hidden="true"
                    className={value <= testimonial.rating ? "is-on" : undefined}
                    fill={value <= testimonial.rating ? "currentColor" : "none"}
                  />
                ))}
              </div>
              <h2>{testimonial.title}</h2>
              <p>{testimonial.body}</p>
              <div className="testimonial-meta">
                <span className="testimonial-name">{testimonial.reviewer_name}</span>
                {testimonial.product_name && <span className="testimonial-product">{testimonial.product_name}</span>}
                {published && <time dateTime={testimonial.created_at}>{published}</time>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
