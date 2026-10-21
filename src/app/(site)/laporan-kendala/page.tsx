"use client";

import { AlertCircle, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { DEMO_MODE, ReportApiError, reportsApi, type ReportFieldErrors } from "@/lib/api";

const categories = ["Pembayaran", "Akses layanan", "Pesanan", "Lainnya"];

// Baris 57: teks info cooldown persis seperti tertulis di dokumen QA.
const cooldownCopy = "Mohon tunggu proses penanganan terlebih dahulu. Untuk menghindari laporan berulang, laporan berikutnya dapat dikirim kembali setelah 3 jam.";

export default function IssueReportPage() {
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<ReportFieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      order_number: String(data.get("order") ?? "").trim(),
      category: String(data.get("category") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
    };

    // The backend is the authority on validity; the browser pass only avoids a
    // round trip for the obvious cases.
    const next: ReportFieldErrors = {};
    if (!payload.name) next.name = "Nama wajib diisi.";
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) next.email = "Masukkan alamat email yang valid.";
    if (!payload.order_number) next.order_number = "Nomor pesanan wajib diisi.";
    if (!payload.category) next.category = "Pilih kategori kendala.";
    if (!payload.message) next.message = "Jelaskan kendala yang Anda alami.";
    setErrors(next);
    setSubmitError("");
    setCooldown(false);
    if (Object.keys(next).length) return;

    if (DEMO_MODE) {
      setSent(true);
      return;
    }

    setSubmitting(true);
    try {
      await reportsApi.create(payload);
      setSent(true);
    } catch (error) {
      if (error instanceof ReportApiError) {
        if (error.status === 400) {
          setErrors({
            name: "Nama wajib diisi.",
            email: "Masukkan alamat email yang valid.",
            order_number: "Nomor pesanan wajib diisi.",
            category: "Pilih kategori kendala.",
            message: "Jelaskan kendala yang Anda alami.",
          });
          setSubmitError(error.message);
          return;
        }
        if (error.status === 429) {
          setCooldown(true);
          setSubmitError(error.message || cooldownCopy);
          return;
        }
        if (Object.keys(error.fields).length) setErrors(error.fields);
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Laporan gagal dikirim. Periksa koneksi Anda lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="support-hero">
        <div className="container">
          <span className="eyebrow">Pusat bantuan</span>
          <h1 className="h1">Laporan Kendala</h1>
          <p>Sampaikan masalah pesanan, pembayaran, atau akses. Sertakan informasi yang cukup agar dapat ditindaklanjuti.</p>
        </div>
      </section>
      <section className="container issue-page">
        <form className="card issue-form" onSubmit={submit} noValidate>
          {sent ? (
            <div className="issue-success">
              {/* Baris 58: animasi ceklis harus berada di sebelah teks, bukan di atasnya. */}
              <div className="issue-success-heading">
                <svg className="issue-check" viewBox="0 0 52 52" role="img" aria-label="Laporan berhasil dikirim">
                  <circle className="issue-check-ring" cx="26" cy="26" r="23" fill="none" />
                  <path className="issue-check-mark" fill="none" d="M15 27l7.5 7.5L37.5 19" />
                </svg>
                <h2>Laporan Diterima</h2>
              </div>
              <p>Catat nomor pesanan Anda. Tim akan meninjau laporan berdasarkan informasi yang dikirimkan.</p>
              <p className="muted small">Tim Necly akan menindaklanjuti melalui email yang Anda masukkan. Jika butuh bantuan cepat, <a href="mailto:necly.services@gmail.com">hubungi admin via email</a>.</p>
              {/* Baris 57: info cooldown 3 jam, tanpa tombol "kirim laporan lain". */}
              <p className="issue-cooldown">{cooldownCopy}</p>
              {/* Baris 60: tombol putih, dan berubah seperti tombol "Kirim laporan"
                  saat disorot — mengikuti pola tombol di halaman Testimoni. */}
              <Link className="button issue-home-button" href="/"><Home size={14} /> Beranda</Link>
            </div>
          ) : (
            <>
              {/* Baris 59: setiap field wajib diberi tanda bintang merah. */}
              <div className="form-grid">
                <label className="field">
                  <span className="label">Nama <span className="commerce-required" aria-hidden="true">*</span></span>
                  <input className="input" required name="name" placeholder="Nama Anda" aria-invalid={Boolean(errors.name)} />
                  {errors.name && <span className="field-error" role="alert">{errors.name}</span>}
                </label>
                <label className="field">
                  <span className="label">Email <span className="commerce-required" aria-hidden="true">*</span></span>
                  <input className="input" required name="email" type="email" placeholder="email@contoh.id" aria-invalid={Boolean(errors.email)} />
                  {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
                </label>
                <label className="field">
                  <span className="label">Nomor pesanan <span className="commerce-required" aria-hidden="true">*</span></span>
                  {/* Baris 55: nomor pesanan wajib dan harus cocok dengan email pemesan. */}
                  <input className="input" required name="order" placeholder="Contoh: NCL-2026-0001" aria-invalid={Boolean(errors.order_number)} />
                  {errors.order_number && <span className="field-error" role="alert">{errors.order_number}</span>}
                </label>
                <label className="field">
                  <span className="label">Kategori kendala <span className="commerce-required" aria-hidden="true">*</span></span>
                  <select className="select" required name="category" defaultValue="" aria-invalid={Boolean(errors.category)}>
                    <option value="">Pilih kategori</option>
                    {categories.map((category) => <option value={category} key={category}>{category}</option>)}
                  </select>
                  {errors.category && <span className="field-error" role="alert">{errors.category}</span>}
                </label>
              </div>
              <label className="field" style={{ marginTop: 18 }}>
                <span className="label">Jelaskan kendala <span className="commerce-required" aria-hidden="true">*</span></span>
                <textarea className="textarea" required name="message" placeholder="Tuliskan kronologi, pesan kesalahan, dan waktu kejadian. Jangan sertakan kata sandi atau OTP." aria-invalid={Boolean(errors.message)} />
                {errors.message && <span className="field-error" role="alert">{errors.message}</span>}
              </label>
              {submitError && <p className="issue-submit-error" role="alert"><AlertCircle size={16} />{submitError}</p>}
              {!cooldown && <p className="issue-hint">Nomor pesanan dan email harus sesuai dengan pesanan Anda. Untuk menghindari laporan berulang, laporan berikutnya dapat dikirim kembali setelah 3 jam.</p>}
              <div className="issue-form-actions">
                <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Mengirim…" : "Kirim laporan"}</button>
                {/* Baris 60: kedua tombol diberi jarak dan lebar yang sama dengan form. */}
                <Link className="button issue-back-button" href="/"><ArrowLeft size={15} /> Beranda</Link>
              </div>
            </>
          )}
        </form>
      </section>
    </>
  );
}
