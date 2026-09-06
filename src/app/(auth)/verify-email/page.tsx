"use client";

import { ArrowLeft, MailCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { authApi, DEMO_MODE } from "@/lib/api";

function VerificationContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "anda@contoh.id";
  const token = searchParams.get("token") ?? "";
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const resend = () => {
    setSeconds(30);
    setMessage(DEMO_MODE ? "Demo: permintaan kirim ulang dicatat. Tidak ada email yang dikirim." : "Permintaan dikirim. Cek email Anda.");
  };

  const verify = async () => {
    if (!token) {
      setMessage("Token verifikasi tidak ditemukan. Minta kirim ulang atau daftarkan ulang.");
      return;
    }
    if (DEMO_MODE) {
      setVerified(true);
      setMessage("Mode demo: verifikasi disimulasikan. Silakan masuk.");
      return;
    }
    setVerifying(true);
    try {
      await authApi.verifyEmail(token);
      setVerified(true);
      setMessage("Email terverifikasi. Silakan masuk.");
    } catch {
      setMessage("Verifikasi gagal. Token mungkin sudah kadaluarsa atau tidak valid. Minta kirim ulang.");
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="auth-form" style={{ justifyItems: "start" }}>
        <div className="mobile-menu-button" style={{ display: "block" }}><BrandLogo href="/" /></div>
        <span className="success-mark"><CheckCircle2 size={25} /></span>
        <div><span className="eyebrow">Selesai</span><h1 className="h2" style={{ marginTop: 10 }}>Email terverifikasi.</h1></div>
        <p className="muted" style={{ margin: 0 }}>{message}</p>
        <Link className="button button-primary" style={{ width: "100%", marginTop: 16 }} href="/login"><ArrowLeft size={14} /> Masuk</Link>
      </div>
    );
  }

  return (
    <div className="auth-form" style={{ justifyItems: "start" }}>
      <div className="mobile-menu-button" style={{ display: "block" }}><BrandLogo href="/" /></div>
      <span className="success-mark"><MailCheck size={25} /></span>
      <div><span className="eyebrow">{DEMO_MODE ? "Mode demo" : "Satu langkah lagi"}</span><h1 className="h2" style={{ marginTop: 10 }}>Verifikasi email Anda.</h1></div>
      <p className="muted" style={{ margin: 0 }}>Dalam produk langsung, Necly Services akan mengirim tautan aman ke <strong style={{ color: "var(--ink)" }}>{email}</strong>. {DEMO_MODE ? "Mode demo tidak mengirim pesan." : "Buka tautan verifikasi di browser yang sama. Tautan kadaluarsa dan hanya dapat digunakan sekali."}</p>
      <div className="demo-banner" style={{ width: "100%" }}><span>{DEMO_MODE ? "Demo: verifikasi akan disimulasikan tanpa menghubungi backend." : "Token verifikasi diteruskan dari pendaftaran atau email."}</span></div>
      {message && <div className="notice success" role="status">{message}</div>}
      <button className="button button-primary" style={{ width: "100%" }} type="button" disabled={seconds > 0 || verifying} onClick={resend}>{seconds > 0 ? `Kirim ulang tersedia dalam ${seconds}s` : "Kirim ulang verifikasi"}</button>
      <button className="button button-primary" style={{ width: "100%", marginTop: 8 }} type="button" disabled={verifying} onClick={verify}>{verifying ? "Memverifikasi…" : DEMO_MODE ? "Simulasikan verifikasi" : "Verifikasi sekarang"}</button>
      <Link className="button button-ghost" style={{ width: "100%", marginTop: 8 }} href="/login"><ArrowLeft size={14} /> Kembali ke masuk</Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div className="skeleton" style={{ width: 400, height: 300 }} />}><VerificationContent /></Suspense>;
}