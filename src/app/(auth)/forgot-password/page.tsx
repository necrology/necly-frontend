"use client";

import { ArrowLeft, MailCheck, Send } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ApiError, authApi, DEMO_MODE } from "@/lib/api";

// Baris 67: sebelumnya semua kegagalan (429, 5xx, maupun jaringan) tampil sebagai
// "Periksa koneksi Anda" sehingga sebab sebenarnya tidak pernah terlihat.
function failureMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Terlalu banyak permintaan atur ulang. Tunggu beberapa menit lalu coba lagi.";
    if (error.status >= 500) return "Server sedang tidak dapat memproses permintaan. Coba lagi beberapa saat lagi.";
    return error.message || `Permintaan ditolak (HTTP ${error.status}).`;
  }
  return "Permintaan gagal dikirim. Periksa koneksi Anda lalu coba lagi.";
}

export default function ForgotPasswordPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextEmail = String(data.get("email") ?? "").trim();
    const next: Record<string, string> = {};

    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) next.email = "Masukkan alamat email yang valid.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setEmail(nextEmail);
    setSubmitting(true);
    try {
      if (!DEMO_MODE) await authApi.forgotPassword(nextEmail);
      // The backend answers the same way for a registered and an unregistered
      // address, so this screen must not claim that an account was found.
      setSent(true);
    } catch (error) {
      // Jejak ke konsol supaya laporan QA berikutnya menyebut sebab yang pasti.
      console.error("[forgot-password] permintaan same-origin gagal", error);
      setErrors({ submit: failureMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-form" style={{ justifyItems: "start" }}>
        <div className="mobile-menu-button" style={{ display: "block" }}><BrandLogo href="/" /></div>
        <span className="success-mark"><MailCheck size={25} /></span>
        <div><span className="eyebrow">{DEMO_MODE ? "Mode demo" : "Periksa email Anda"}</span><h1 className="h2" style={{ marginTop: 10 }}>Tautan atur ulang dikirim.</h1></div>
        <p className="muted" style={{ margin: 0 }}>
          {DEMO_MODE
            ? "Mode demo tidak mengirim email. Di produk langsung, tautan atur ulang kata sandi dikirim ke alamat yang terdaftar."
            : <>Jika <strong style={{ color: "var(--ink)" }}>{email}</strong> terdaftar, kami sudah mengirim tautan atur ulang kata sandi ke alamat itu. Tautan hanya dapat digunakan sekali dan berlaku terbatas.</>}
        </p>
        <p className="muted small" style={{ margin: 0 }}>
          Tidak menerima email? Periksa folder spam dan pastikan alamat tersebut sudah pernah didaftarkan. Demi keamanan, kami tidak menampilkan apakah suatu alamat memiliki akun.
        </p>
        <button className="button button-secondary" style={{ width: "100%", marginTop: 8 }} type="button" onClick={() => setSent(false)}>Kirim ulang</button>
        <Link className="button button-ghost" style={{ width: "100%" }} href="/register">Belum punya akun? Daftar</Link>
        <Link className="button button-ghost" style={{ width: "100%" }} href="/login"><ArrowLeft size={14} /> Kembali ke masuk</Link>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="mobile-menu-button" style={{ display: "block" }}><BrandLogo href="/" /></div>
      <div>
        <span className="eyebrow">Lupa kata sandi</span>
        <h1 className="h2" style={{ marginTop: 10 }}>Atur ulang kata sandi Anda.</h1>
        <p className="muted" style={{ marginTop: 14, marginBottom: 0 }}>{DEMO_MODE ? "Mode demo aktif. Tidak ada email yang dikirim." : "Masukkan alamat email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru."}</p>
      </div>
      <form onSubmit={submit} style={{ display: "grid", gap: 18 }} noValidate>
        <div className="field">
          <label className="label" htmlFor="forgot-email">Alamat email</label>
          <input className="input" id="forgot-email" name="email" type="email" autoComplete="email" placeholder="anda@contoh.id" aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
        </div>
        {errors.submit && <div className="notice" role="alert" style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}>{errors.submit}</div>}
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Mengirim…" : <>Kirim tautan atur ulang <Send size={14} /></>}</button>
      </form>
      <Link className="button button-ghost" href="/login"><ArrowLeft size={14} /> Kembali ke masuk</Link>
    </div>
  );
}
