"use client";

import { ArrowLeft, MailCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ApiError, authApi, DEMO_MODE } from "@/lib/api";

function VerificationContent() {
  const searchParams = useSearchParams();
  // Alamat asli dari pendaftaran dipisahkan dari teks tampilan: hanya yang asli
  // boleh dikirim ke backend saat minta tautan baru.
  const emailParam = searchParams.get("email");
  const email = emailParam ?? "anda@contoh.id";
  const token = searchParams.get("token") ?? "";
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  // Kirim ulang sebelumnya hanya menampilkan pesan sukses palsu tanpa memanggil
  // backend, sehingga email yang hilang tidak pernah bisa diganti.
  const resend = async () => {
    if (DEMO_MODE) {
      setSeconds(30);
      setMessage("Demo: permintaan kirim ulang dicatat. Tidak ada email yang dikirim.");
      return;
    }
    if (!emailParam) {
      setMessage("Alamat email tidak diketahui. Silakan daftar ulang atau hubungi tim Necly Services.");
      return;
    }
    setResending(true);
    setMessage("");
    try {
      await authApi.resendVerification(emailParam);
      setSeconds(30);
      setMessage("Tautan verifikasi baru sudah dikirim. Periksa kotak masuk dan folder spam Anda.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Gagal mengirim ulang. Periksa koneksi Anda lalu coba lagi.");
    } finally {
      setResending(false);
    }
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
      <p className="muted" style={{ margin: 0 }}>Kami sudah mengirim tautan aktivasi ke <strong style={{ color: "var(--ink)" }}>{email}</strong>. {DEMO_MODE ? "Mode demo tidak mengirim pesan." : "Buka tautan itu untuk mengaktifkan akun. Tautan berlaku terbatas dan hanya dapat dipakai satu kali. Belum menerimanya? Gunakan tombol kirim ulang di bawah."}</p>
      {DEMO_MODE && <div className="demo-banner" style={{ width: "100%" }}><span>Demo: verifikasi akan disimulasikan tanpa menghubungi backend.</span></div>}
      {message && <div className="notice success" role="status">{message}</div>}
      <button className="button button-secondary" style={{ width: "100%" }} type="button" disabled={seconds > 0 || verifying || resending} onClick={resend}>{resending ? "Mengirim…" : seconds > 0 ? `Kirim ulang tersedia dalam ${seconds}s` : "Kirim ulang verifikasi"}</button>
      <button className="button button-primary" style={{ width: "100%", marginTop: 8 }} type="button" disabled={verifying} onClick={verify}>{verifying ? "Memverifikasi…" : DEMO_MODE ? "Simulasikan verifikasi" : "Verifikasi sekarang"}</button>
      <Link className="button button-ghost" style={{ width: "100%", marginTop: 8 }} href="/login"><ArrowLeft size={14} /> Kembali ke masuk</Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div className="skeleton" style={{ width: 400, height: 300 }} />}><VerificationContent /></Suspense>;
}