"use client";

import { CheckCircle2, KeyRound, Laptop, LogOut, ReceiptText, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PasswordField } from "@/components/password-field";
import { ApiError, authApi, bootstrapAuth, type ApiSession, type User } from "@/lib/api";
import { passwordError } from "@/lib/auth-validation";

// Nama perangkat dibaca dari User-Agent supaya daftar sesi bisa dikenali tanpa
// menampilkan string mentah yang panjang.
function deviceLabel(userAgent: string) {
  const ua = userAgent || "";
  const browser = /Edg\//.test(ua) ? "Microsoft Edge"
    : /OPR\//.test(ua) ? "Opera"
      : /Firefox\//.test(ua) ? "Firefox"
        : /Chrome\//.test(ua) ? "Chrome"
          : /Safari\//.test(ua) ? "Safari"
            : "Peramban lain";
  const platform = /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) ? "iOS"
      : /Windows/i.test(ua) ? "Windows"
        : /Mac OS X/i.test(ua) ? "macOS"
          : /Linux/i.test(ua) ? "Linux"
            : "";
  return platform ? `${browser} di ${platform}` : browser;
}

function formatMoment(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AccountPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ApiSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState("");
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [busySession, setBusySession] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const response = await authApi.listSessions();
      setSessions(response.sessions);
      setSessionsError("");
    } catch (error) {
      setSessionsError(error instanceof ApiError ? error.message : "Gagal memuat daftar sesi.");
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessionUser = await bootstrapAuth().catch(() => null);
      if (cancelled) return;
      if (!sessionUser) {
        router.replace("/login?redirect=%2Fakun");
        return;
      }
      setUser(sessionUser);
      setChecking(false);
      await loadSessions();
    })();
    return () => {
      cancelled = true;
    };
  }, [router, loadSessions]);

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("current") ?? "");
    const newPassword = String(data.get("password") ?? "");
    const next: Record<string, string> = {};

    if (!currentPassword) next.current = "Masukkan kata sandi Anda saat ini.";
    const validation = passwordError(newPassword);
    if (validation) next.password = validation;
    if (newPassword !== String(data.get("confirm") ?? "")) next.confirm = "Konfirmasi kata sandi tidak cocok.";
    if (currentPassword && currentPassword === newPassword) next.password = "Kata sandi baru harus berbeda dari yang sekarang.";
    setErrors(next);
    setNotice("");
    if (Object.keys(next).length) return;

    setSavingPassword(true);
    try {
      const response = await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setNotice(response.message);
      form.reset();
      await loadSessions();
      // QA baris 78: setelah kata sandi berubah, sesi ini juga harus berakhir.
      // Beri waktu singkat agar pesan sukses terbaca, lalu logout dan ke login.
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      logoutTimer.current = setTimeout(async () => {
        try {
          await authApi.logout();
        } finally {
          router.replace("/login?passwordChanged=1");
        }
      }, 2500);
    } catch (error) {
      setErrors({ submit: error instanceof ApiError ? error.message : "Kata sandi gagal diubah. Coba lagi." });
    } finally {
      setSavingPassword(false);
    }
  };

  const endSession = async (session: ApiSession) => {
    setBusySession(session.id);
    setNotice("");
    try {
      await authApi.revokeSession(session.id);
      setNotice("Sesi diakhiri.");
      await loadSessions();
    } catch (error) {
      setSessionsError(error instanceof ApiError ? error.message : "Sesi gagal diakhiri.");
    } finally {
      setBusySession("");
    }
  };

  const endOtherSessions = async () => {
    setBusySession("all");
    setNotice("");
    try {
      const response = await authApi.revokeOtherSessions();
      setNotice(response.ended > 0 ? `${response.ended} sesi lain sudah diakhiri.` : "Tidak ada sesi lain yang aktif.");
      await loadSessions();
    } catch (error) {
      setSessionsError(error instanceof ApiError ? error.message : "Sesi lain gagal diakhiri.");
    } finally {
      setBusySession("");
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await authApi.logout();
    } finally {
      setSigningOut(false);
      router.push("/");
    }
  };

  if (checking || !user) {
    return (
      <section className="container account-page" aria-busy="true">
        <span className="skeleton" style={{ width: 220, height: 26 }} />
        <span className="skeleton" style={{ width: 100, height: 100 }} />
        <span className="skeleton" style={{ width: "100%", height: 180 }} />
      </section>
    );
  }

  const otherSessions = (sessions ?? []).filter((session) => !session.current);

  return (
    <section className="container account-page">
      <header className="account-head">
        <span className="eyebrow">Akun saya</span>
        <h1 className="h1">Akun &amp; keamanan</h1>
        <p className="lede">Kelola kata sandi dan perangkat yang masih masuk ke akun Anda.</p>
        <div className="account-head-links">
          <Link className="button button-secondary button-sm account-orders-link" href="/orders">
            <ReceiptText size={15} aria-hidden="true" /> Pesanan saya
          </Link>
          <Link className="button button-secondary button-sm" href="/otp">
            <KeyRound size={15} aria-hidden="true" /> Ambil OTP akun
          </Link>
        </div>
      </header>

      <article className="card account-card">
        <h2 className="h3">Profil</h2>
        <dl className="account-facts">
          <div><dt>Nama</dt><dd>{user.name}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div>
            <dt>Status email</dt>
            <dd>
              {user.emailVerifiedAt
                ? <><CheckCircle2 size={15} aria-hidden="true" /> Terverifikasi</>
                : <><TriangleAlert size={15} aria-hidden="true" /> Belum terverifikasi</>}
            </dd>
          </div>
        </dl>
        <button className="button button-secondary" type="button" onClick={signOut} disabled={signingOut}>
          <LogOut size={15} /> {signingOut ? "Keluar…" : "Keluar dari perangkat ini"}
        </button>
      </article>

      <article className="card account-card">
        <h2 className="h3"><KeyRound size={16} aria-hidden="true" /> Ubah kata sandi</h2>
        <p className="muted small account-password-hint">
          Masukkan kata sandi Anda saat ini untuk mengkonfirmasi.
          <br />
          Setelah tersimpan, semua perangkat lain akan keluar otomatis.
        </p>
        {notice && <div className="notice success" role="status">{notice}</div>}
        {errors.submit && <div className="notice" role="alert" style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}>{errors.submit}</div>}
        <form onSubmit={submitPassword} noValidate>
          <PasswordField id="account-current" name="current" label="Kata sandi saat ini" autoComplete="current-password" placeholder="Kata sandi sekarang" error={errors.current} required />
          <Link className="button button-ghost button-sm auth-forgot-link account-forgot-link" href="/forgot-password">Lupa sandi saat ini?</Link>
          <PasswordField id="account-new" name="password" label="Kata sandi baru" autoComplete="new-password" placeholder="Minimal 10 karakter" error={errors.password} required />
          <PasswordField id="account-confirm" name="confirm" label="Konfirmasi kata sandi baru" autoComplete="new-password" placeholder="Ulangi kata sandi baru" error={errors.confirm} required />
          <button className="button button-primary" type="submit" disabled={savingPassword}>
            {savingPassword ? "Menyimpan…" : "Simpan kata sandi baru"}
          </button>
        </form>
      </article>

      <article className="card account-card">
        <h2 className="h3"><ShieldCheck size={16} aria-hidden="true" /> Perangkat yang masuk</h2>
        <p className="muted small">Jika ada perangkat yang tidak Anda kenali, akhiri sesinya lalu ubah kata sandi Anda.</p>
        {sessionsError && <div className="notice" role="alert" style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}>{sessionsError}</div>}
        {sessions === null ? (
          <span className="skeleton" style={{ width: "100%", height: 90 }} />
        ) : (
          <ul className="account-sessions">
            {sessions.map((session) => (
              <li key={session.id}>
                <span className="account-session-icon" aria-hidden="true">
                  {/Android|iPhone|iPad|iPod/i.test(session.user_agent) ? <Smartphone size={17} /> : <Laptop size={17} />}
                </span>
                <div>
                  <strong>{deviceLabel(session.user_agent)}</strong>
                  <small>Masuk {formatMoment(session.created_at)} · berlaku sampai {formatMoment(session.expires_at)}</small>
                </div>
                {session.current
                  ? <span className="account-session-current">Perangkat ini</span>
                  : <button className="button button-secondary button-sm" type="button" onClick={() => endSession(session)} disabled={busySession === session.id}>{busySession === session.id ? "Mengakhiri…" : "Akhiri"}</button>}
              </li>
            ))}
          </ul>
        )}
        {otherSessions.length > 0 && (
          <button className="button button-secondary" type="button" onClick={endOtherSessions} disabled={busySession === "all"}>
            {busySession === "all" ? "Mengakhiri…" : `Akhiri ${otherSessions.length} sesi lain`}
          </button>
        )}
      </article>
    </section>
  );
}
