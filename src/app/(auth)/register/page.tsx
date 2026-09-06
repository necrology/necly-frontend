"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PasswordField } from "@/components/password-field";
import { authApi, DEMO_MODE } from "@/lib/api";
import { passwordError } from "@/lib/auth-validation";

export default function RegisterPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationToken, setVerificationToken] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const nextEmail = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const next: Record<string, string> = {};

    if (name.length < 2) next.name = "Masukkan nama lengkap Anda.";
    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) next.email = "Masukkan alamat email yang valid.";
    const passwordValidation = passwordError(password);
    if (passwordValidation) next.password = passwordValidation;
    if (password !== String(data.get("confirm") ?? "")) next.confirm = "Konfirmasi kata sandi tidak cocok.";
    if (!data.get("terms")) next.terms = "Setujui syarat dan ketentuan untuk melanjutkan.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      if (DEMO_MODE) {
        setEmail(nextEmail);
        setDone(true);
        return;
      }

      const response = await authApi.register({ name, email: nextEmail, password });
      setEmail(nextEmail);
      setVerificationToken(response.verification_token);
      setDone(true);
    } catch {
      setErrors({ submit: "Pendaftaran gagal. Alamat email mungkin sudah digunakan atau data belum valid." });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const query = new URLSearchParams({ email });
    if (verificationToken) query.set("token", verificationToken);
    return (
      <div className="auth-form" style={{ justifyItems: "start" }}>
        <span className="success-mark"><CheckCircle2 size={25} /></span>
        <span className="eyebrow">{DEMO_MODE ? "Pendaftaran demo selesai" : "Akun berhasil dibuat"}</span>
        <h1 className="h2">Periksa email Anda.</h1>
        <p className="muted">{DEMO_MODE ? "Tidak ada akun atau email yang benar-benar dibuat. Lanjutkan untuk melihat pengalaman verifikasi demo." : <>Kami menyiapkan verifikasi untuk <strong>{email}</strong>. Buka tautan verifikasi agar akun dapat digunakan.</>}</p>
        <Link className="button button-primary" href={`/verify-email?${query.toString()}`}>Lanjut ke verifikasi <ArrowRight size={14} /></Link>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="mobile-menu-button" style={{ display: "block" }}><BrandLogo href="/" /></div>
      <div>
        <span className="eyebrow">Buat akun</span>
        <h1 className="h2" style={{ marginTop: 10 }}>Mulai berlangganan dengan jelas.</h1>
        <p className="muted" style={{ marginBottom: 0 }}>{DEMO_MODE ? "Mode demo aktif. Data pendaftaran tidak akan dikirim." : "Daftar untuk membeli dan melacak akses langganan Anda."}</p>
      </div>
      <form onSubmit={submit} style={{ display: "grid", gap: 16 }} noValidate>
        <div className="field"><label className="label" htmlFor="name">Nama lengkap</label><input className="input" id="name" name="name" autoComplete="name" placeholder="Nama Anda" aria-invalid={Boolean(errors.name)} />{errors.name && <span className="field-error" role="alert">{errors.name}</span>}</div>
        <div className="field"><label className="label" htmlFor="register-email">Alamat email</label><input className="input" id="register-email" name="email" type="email" autoComplete="email" placeholder="anda@contoh.id" aria-invalid={Boolean(errors.email)} />{errors.email && <span className="field-error" role="alert">{errors.email}</span>}</div>
        <PasswordField id="register-password" name="password" label="Kata sandi" autoComplete="new-password" placeholder="10–72 byte" error={errors.password} />
        <PasswordField id="confirm-password" name="confirm" label="Konfirmasi kata sandi" autoComplete="new-password" placeholder="Ulangi kata sandi" error={errors.confirm} />
        <label className="check-row"><input name="terms" type="checkbox" /><span>{DEMO_MODE ? "Saya memahami bahwa mode demo tidak membuat akun nyata." : "Saya menyetujui syarat dan ketentuan Necly Services."}</span></label>
        {errors.terms && <span className="field-error" role="alert">{errors.terms}</span>}
        {errors.submit && <div className="notice" role="alert" style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}>{errors.submit}</div>}
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Membuat akun…" : <>Buat akun <ArrowRight size={14} /></>}</button>
      </form>
      <p className="muted small" style={{ textAlign: "center", margin: 0 }}>Sudah memiliki akun? <Link href="/login" style={{ color: "var(--blue)", fontWeight: 600 }}>Masuk</Link></p>
    </div>
  );
}
