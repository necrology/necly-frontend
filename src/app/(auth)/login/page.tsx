"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PasswordField } from "@/components/password-field";
import { authApi, DEMO_MODE } from "@/lib/api";
import { passwordError, safeRedirectPath } from "@/lib/auth-validation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const next: Record<string, string> = {};

    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Masukkan alamat email yang valid.";
    const passwordValidation = passwordError(password);
    if (passwordValidation) next.password = passwordValidation;
    setErrors(next);
    setSubmitted(false);
    if (Object.keys(next).length) return;

    if (DEMO_MODE) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      await authApi.login({ email, password });
      router.push(safeRedirectPath(searchParams.get("redirect")));
    } catch {
      setErrors({ submit: "Gagal masuk. Periksa alamat email dan kata sandi Anda, lalu coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="mobile-menu-button" style={{ display: "block" }}><BrandLogo href="/" /></div>
      <div>
        <span className="eyebrow">Selamat datang kembali</span>
        <h1 className="h2" style={{ marginTop: 10 }}>Masuk ke Necly Services.</h1>
        <p className="muted" style={{ marginBottom: 0 }}>{DEMO_MODE ? "Mode demo aktif. Data login tidak akan dikirim." : "Kelola pesanan dan akses langganan Anda."}</p>
      </div>
      {submitted && <div className="demo-banner" role="status"><LockKeyhole size={15} /><span>Validasi demo berhasil. Tidak ada sesi atau akun yang dibuat.</span></div>}
      <form onSubmit={submit} style={{ display: "grid", gap: 18 }} noValidate>
        <div className="field">
          <label className="label" htmlFor="login-email">Alamat email</label>
          <input className="input" id="login-email" name="email" type="email" autoComplete="email" placeholder="anda@contoh.id" aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
        </div>
        <PasswordField id="login-password" name="password" label="Kata sandi" autoComplete="current-password" placeholder="10–72 byte" error={errors.password} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
          <label className="check-row"><input type="checkbox" /><span>Ingat saya</span></label>
          <button className="button button-ghost button-sm" type="button">Lupa kata sandi?</button>
        </div>
        {errors.submit && <div className="notice" role="alert" style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}>{errors.submit}</div>}
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Sedang masuk…" : <>Masuk <ArrowRight size={14} /></>}</button>
      </form>
      {DEMO_MODE && <><div className="auth-divider">Akses demo</div><Link className="button button-secondary" href="/dashboard">Buka demo admin</Link></>}
      <p className="muted small" style={{ textAlign: "center", margin: 0 }}>Belum memiliki akun? <Link href="/register" style={{ color: "var(--blue)", fontWeight: 600 }}>Daftar</Link></p>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="skeleton" style={{ width: 400, height: 420 }} />}><LoginContent /></Suspense>;
}
