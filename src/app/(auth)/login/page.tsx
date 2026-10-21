"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleSignInButton } from "@/components/google-sign-in";
import { PasswordField } from "@/components/password-field";
import { ApiError, authApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { passwordError, safeRedirectPath } from "@/lib/auth-validation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Akun yang belum diverifikasi tidak bisa masuk sama sekali, jadi layar ini
  // harus menawarkan tautan aktivasi baru, bukan sekadar menolak.
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendNotice, setResendNotice] = useState("");
  const [resending, setResending] = useState(false);
  // QA baris 84: "Ingat saya" menyimpan email agar tidak perlu diketik ulang.
  // Kata sandi tidak pernah disimpan di localStorage; biarkan password manager
  // browser yang menanganinya.
  const [remember, setRemember] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const expired = searchParams.get("expired") === "1";
  const passwordChanged = searchParams.get("passwordChanged") === "1";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("necly-remember-email");
    if (!saved) return;
    // Tunda satu tick agar hidrasi server dan klien tidak berbeda, sekaligus
    // menghindari setState sinkron di dalam effect.
    const timer = window.setTimeout(() => {
      setEmailValue(saved);
      setRemember(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Pengunjung yang sesinya masih berlaku tidak perlu disuguhi formulir masuk.
  // Sebelumnya halaman ini selalu menampilkan formulir, sehingga tautan mana pun
  // yang mengarah ke /login terasa seperti dipaksa keluar lagi.
  const redirectTarget = safeRedirectPath(searchParams.get("redirect"));
  useEffect(() => {
    if (DEMO_MODE) return;
    let cancelled = false;
    bootstrapAuth()
      .then((sessionUser) => {
        if (!cancelled && sessionUser) router.replace(redirectTarget);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [router, redirectTarget]);

  const resendVerification = async () => {
    setResending(true);
    setResendNotice("");
    try {
      if (!DEMO_MODE) await authApi.resendVerification(unverifiedEmail);
      setResendNotice("Tautan verifikasi baru sudah dikirim. Periksa kotak masuk dan folder spam Anda.");
    } catch (error) {
      setResendNotice(error instanceof ApiError ? error.message : "Gagal mengirim ulang tautan verifikasi.");
    } finally {
      setResending(false);
    }
  };

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
    setUnverifiedEmail("");
    setResendNotice("");
    if (Object.keys(next).length) return;
    if (remember) window.localStorage.setItem("necly-remember-email", email);
    else window.localStorage.removeItem("necly-remember-email");

    if (DEMO_MODE) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      await authApi.login({ email, password });
      router.push(safeRedirectPath(searchParams.get("redirect")));
    } catch (error) {
      // Backend membedakan "kata sandi salah" dari "email belum diverifikasi".
      // Pesan spesifiknya dulu dibuang, sehingga pengguna yang cuma belum
      // mengklik tautan aktivasi diberi tahu bahwa kata sandinya salah.
      const message = error instanceof ApiError ? error.message : "";
      const unverified = error instanceof ApiError && error.status === 401 && /verifikasi/i.test(message);
      if (unverified) setUnverifiedEmail(email);
      // 401 tanpa kata "verifikasi" berarti kredensial salah; untuk kasus itu
      // pesan generik lebih jelas. Selain itu pesan backend lebih berguna.
      const showServerMessage = unverified || (error instanceof ApiError && error.status !== 401);
      setErrors({ submit: showServerMessage && message ? message : "Gagal masuk. Periksa alamat email dan kata sandi Anda, lalu coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-form auth-form-login">
      <div className="mobile-menu-button" style={{ display: "block" }}><BrandLogo href="/" /></div>
      <div className="figma-desktop-auth-logo"><Image src="/design-assets/necly-logo.png" alt="Necly Services" width={112} height={111} loading="eager" unoptimized /></div>
      <div className="auth-login-intro">
        {/* Baris 63: sapaan dibuat lebih ramah sesuai permintaan QA. */}
        <span className="eyebrow auth-login-greeting">Hi, Senang Bertemu Kembali</span>
        <h1 className="h2" style={{ marginTop: 10 }}>Masuk ke Necly Services.</h1>
        {/* Baris 64: jarak subtitle ke judul ditambah supaya tidak mepet. */}
        <p className="muted auth-login-subtitle">{DEMO_MODE ? "Mode demo aktif. Data login tidak akan dikirim." : "Kelola pesanan dan akses langganan Anda."}</p>
      </div>
      {submitted && <div className="demo-banner" role="status"><LockKeyhole size={15} /><span>Validasi demo berhasil. Tidak ada sesi atau akun yang dibuat.</span></div>}
      {expired && <div className="notice" role="status">Sesi Anda sudah berakhir. Silakan masuk kembali.</div>}
      {passwordChanged && <div className="notice success" role="status">Kata sandi berhasil diubah. Silakan masuk kembali.</div>}
      <form onSubmit={submit} style={{ display: "grid", gap: 18 }} noValidate>
        <div className="field">
          <label className="label" htmlFor="login-email">Alamat email</label>
          <input className="input" id="login-email" name="email" type="email" autoComplete="username" placeholder="anda@contoh.id" value={emailValue} onChange={(event) => setEmailValue(event.target.value)} aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
        </div>
        <PasswordField id="login-password" name="password" label="Kata sandi" autoComplete="current-password" placeholder="Masukkan kata sandi" error={errors.password} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
          <label className="check-row"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Ingat saya</span></label>
          {/* Baris 65: tautan lupa kata sandi diberi warna aksen biru supaya jelas
              bisa diklik dan mengantar ke halaman atur ulang kata sandi. */}
          <Link className="button button-ghost button-sm auth-forgot-link" href="/forgot-password">Lupa kata sandi?</Link>
        </div>
        {errors.submit && <div className="notice" role="alert" style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}>{errors.submit}</div>}
        {unverifiedEmail && (
          <div className="auth-resend">
            <button className="button button-secondary button-sm" type="button" onClick={resendVerification} disabled={resending}>
              {resending ? "Mengirim…" : "Kirim ulang tautan verifikasi"}
            </button>
            {resendNotice && <p className="muted small" role="status">{resendNotice}</p>}
            <p className="muted small" style={{ margin: 0 }}>Masih tidak menerima email? <a href="mailto:necly.services@gmail.com">Hubungi admin via email</a>.</p>
          </div>
        )}
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Sedang masuk…" : <>Masuk <ArrowRight size={14} /></>}</button>
      </form>
      <GoogleSignInButton label="Masuk dengan Google" />
      {DEMO_MODE && <><div className="auth-divider">Akses demo</div><Link className="button button-secondary" href="/dashboard">Buka demo admin</Link></>}
      {/* Baris 66: font bagian ini diperbesar supaya jelas terlihat. */}
      <p className="muted auth-register-prompt">Belum memiliki akun? <Link href="/register">Daftar</Link></p>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="skeleton" style={{ width: 400, height: 420 }} />}><LoginContent /></Suspense>;
}
