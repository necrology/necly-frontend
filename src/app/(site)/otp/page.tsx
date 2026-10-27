"use client";

import { Check, ClipboardCopy, KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useState } from "react";
import { ApiError, DEMO_MODE, accountOtpApi, type ApiOTPLookup } from "@/lib/api";

type FieldErrors = { email?: string; code?: string };

const errorCopy: Record<string, string> = {
  otp_access_invalid: "Email atau kode akses tidak cocok. Pastikan email akun dan kode akses diisi persis seperti yang tertera.",
  otp_not_found: "Belum ada email OTP baru untuk akun ini. Tunggu beberapa saat setelah platform mengirim kode, lalu coba lagi.",
  otp_unavailable: "Layanan ambil OTP sedang belum tersedia. Hubungi dukungan Necly dengan menyertakan nomor pesanan Anda.",
  otp_lookup_failed: "Email OTP belum dapat dibaca. Coba lagi sebentar lagi atau hubungi dukungan.",
};

function OtpForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState((searchParams.get("code") ?? "").toUpperCase());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiOTPLookup | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FieldErrors = {};
    const cleanEmail = email.trim();
    const cleanCode = code.trim().toUpperCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) next.email = "Masukkan email akun yang valid.";
    if (cleanCode.length < 8) next.code = "Masukkan kode akses yang lengkap.";
    setErrors(next);
    setSubmitError("");
    setResult(null);
    setCopied(false);
    if (Object.keys(next).length) return;

    if (DEMO_MODE) {
      setResult({ otp: "482913", received_at: new Date().toISOString() });
      return;
    }

    setLoading(true);
    try {
      const response = await accountOtpApi.lookup(cleanEmail, cleanCode);
      setResult(response);
    } catch (error) {
      if (error instanceof ApiError) {
        const payload = error.payload as { code?: string } | undefined;
        setSubmitError(errorCopy[payload?.code ?? ""] ?? error.message);
      } else {
        setSubmitError("Gagal mengambil OTP. Periksa koneksi Anda lalu coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.otp);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setSubmitError("Kode OTP tidak dapat disalin otomatis. Salin kode yang tampil secara manual.");
    }
  };

  return (
    <section className="container otp-page">
      <header className="otp-head">
        <span className="eyebrow">Bantuan akses</span>
        <h1 className="h1">Ambil kode OTP akun</h1>
        <p className="lede">
          Platform langganan Anda meminta kode OTP lewat email? Masukkan email akun yang Anda terima
          dan kode akses dari halaman pesanan untuk membaca kode terbaru tanpa membuka email akun.
        </p>
      </header>

      <section className="card otp-help" style={{ padding: 20, marginBottom: 18 }} aria-label="Alur pengambilan OTP">
        <KeyRound size={18} aria-hidden="true" />
        <h2 className="h3">Alur pengambilan OTP</h2>
        <ol className="otp-steps">
          <li>Login ke platform yang dibeli. Saat platform meminta kode OTP lewat email, buka halaman ini.</li>
          <li>Buka detail pesanan → bagian <strong>Akses akun &amp; OTP</strong> → tekan <strong>Buat kode akses OTP</strong>.</li>
          <li>Masukkan email akun dan kode akses tersebut di form ini, lalu tunggu kode OTP terbaru muncul.</li>
          <li>Salin kode OTP dan masukkan ke halaman verifikasi platform untuk menyelesaikan login.</li>
        </ol>
      </section>

      <div className="otp-grid">
        <form className="card otp-form" onSubmit={submit} noValidate>
          <div className="otp-form-heading">
            <Mail size={18} aria-hidden="true" />
            <div>
              <h2 className="h3">Email akun &amp; kode akses</h2>
              <p className="muted small">Keduanya dikirim saat akun pesanan Anda disetujui.</p>
            </div>
          </div>

          <label className="field">
            <span className="label">Email akun <span className="commerce-required" aria-hidden="true">*</span></span>
            <input
              className="input"
              name="email"
              type="email"
              autoComplete="off"
              placeholder="contoh: akun@contoh.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              required
            />
            {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
          </label>

          <label className="field">
            <span className="label">Kode akses <span className="commerce-required" aria-hidden="true">*</span></span>
            <input
              className="input otp-code-input"
              name="code"
              autoComplete="one-time-code"
              spellCheck={false}
              placeholder="Contoh: ABCD234567"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              aria-invalid={Boolean(errors.code)}
              maxLength={16}
              required
            />
            {errors.code && <span className="field-error" role="alert">{errors.code}</span>}
            <span className="otp-hint">
              Buat kode di detail pesanan pada bagian <strong>Akses akun &amp; OTP</strong>. Kode berlaku 15 menit.
            </span>
          </label>

          {submitError && <p className="otp-alert" role="alert">{submitError}</p>}

          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? <><LoaderCircle className="commerce-spin" size={16} /> Membaca email OTP…</> : "Ambil kode OTP"}
          </button>

          <p className="otp-security">
            <ShieldCheck size={15} aria-hidden="true" />
            Kode akses hanya berlaku untuk akun yang Anda beli. Jangan bagikan kode ini kepada siapa pun.
          </p>
        </form>

        <aside className="otp-side">
          {result ? (
            <section className="card otp-result" aria-live="polite">
              <span className="badge status-success">Kode OTP ditemukan</span>
              <p className="muted small">Masukkan kode ini pada layar verifikasi platform. Kode biasanya berlaku beberapa menit.</p>
              <output className="otp-code">{result.otp}</output>
              <button className="button button-primary button-sm" type="button" onClick={copy}>
                {copied ? <><Check size={15} /> Tersalin</> : <><ClipboardCopy size={15} /> Salin kode OTP</>}
              </button>
              {result.received_at && (
                <p className="muted small">
                  Diterima {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.received_at))} WIB
                </p>
              )}
              <p className="otp-result-note">
                Kode OTP baru akan menggantikan kode lama. Jika kode ini ditolak, tunggu email berikutnya lalu ambil ulang.
              </p>
            </section>
          ) : (
            <section className="card otp-help">
              <KeyRound size={18} aria-hidden="true" />
              <h2 className="h3">Belum punya kode akses?</h2>
              <ol className="otp-steps">
                <li>Buka detail pesanan Anda.</li>
                <li>Cari bagian <strong>Akses akun &amp; OTP</strong>.</li>
                <li>Tekan <strong>Buat kode akses OTP</strong>, lalu salin kode yang tampil atau periksa email Anda.</li>
              </ol>
              <Link className="button button-secondary button-sm" href="/orders">Buka pesanan saya</Link>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}

export default function AccountOtpPage() {
  return (
    <Suspense fallback={<section className="container otp-page"><p className="muted">Memuat halaman…</p></section>}>
      <OtpForm />
    </Suspense>
  );
}
