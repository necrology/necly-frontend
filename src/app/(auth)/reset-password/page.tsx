"use client";

import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PasswordField } from "@/components/password-field";
import { authApi, DEMO_MODE } from "@/lib/api";
import { passwordError } from "@/lib/auth-validation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const next: Record<string, string> = {};

    if (!token) next.submit = "Tautan atur ulang tidak lengkap. Minta tautan baru dari halaman lupa kata sandi.";
    const passwordValidation = passwordError(password);
    if (passwordValidation) next.password = passwordValidation;
    if (password !== String(data.get("confirm") ?? "")) next.confirm = "Konfirmasi kata sandi tidak cocok.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      if (!DEMO_MODE) await authApi.resetPassword({ token, password });
      setDone(true);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Kata sandi gagal diatur ulang. Minta tautan baru lalu coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="auth-form" style={{ justifyItems: "start" }}>
        <div className="mobile-menu-button" style={{ display: "block" }}><BrandLogo href="/" /></div>
        <span className="success-mark"><CheckCircle2 size={25} /></span>
        <div><span className="eyebrow">{DEMO_MODE ? "Mode demo" : "Selesai"}</span><h1 className="h2" style={{ marginTop: 10 }}>Kata sandi diperbarui.</h1></div>
        <p className="muted" style={{ margin: 0 }}>Semua sesi yang masih terbuka sudah diakhiri. Silakan masuk kembali dengan kata sandi baru Anda.</p>
        <Link className="button button-primary" style={{ width: "100%", marginTop: 8 }} href="/login">Masuk <ArrowLeft size={14} /></Link>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="mobile-menu-button" style={{ display: "block" }}><BrandLogo href="/" /></div>
      <div>
        <span className="eyebrow">Atur ulang kata sandi</span>
        <h1 className="h2" style={{ marginTop: 10 }}>Buat kata sandi baru.</h1>
        <p className="muted" style={{ marginTop: 14, marginBottom: 0 }}>{DEMO_MODE ? "Mode demo aktif. Kata sandi tidak benar-benar diubah." : "Tautan ini hanya berlaku sekali. Setelah tersimpan, semua sesi lama akan diakhiri."}</p>
      </div>
      <form onSubmit={submit} style={{ display: "grid", gap: 18 }} noValidate>
        <PasswordField id="reset-password" name="password" label="Kata sandi baru" autoComplete="new-password" placeholder="10–72 byte" error={errors.password} />
        <PasswordField id="reset-confirm" name="confirm" label="Konfirmasi kata sandi baru" autoComplete="new-password" placeholder="Ulangi kata sandi baru" error={errors.confirm} />
        {errors.submit && <div className="notice" role="alert" style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}>{errors.submit}</div>}
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Menyimpan…" : <><KeyRound size={14} /> Simpan kata sandi baru</>}</button>
      </form>
      <Link className="button button-ghost" href="/forgot-password">Minta tautan baru</Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="skeleton" style={{ width: 400, height: 340 }} />}><ResetPasswordContent /></Suspense>;
}
