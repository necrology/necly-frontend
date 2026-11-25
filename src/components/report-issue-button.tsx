"use client";

import { LifeBuoy, Mail, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { contact, whatsappLink } from "@/data/contact";

// Jarak dari dasar halaman yang membuat tombol disembunyikan (baris 23).
const FOOTER_CLEARANCE = 340;
// Waktu sembunyikan tombol (5 menit = 300.000 ms).
const HIDE_DURATION = 5 * 60 * 1000;
const STORAGE_KEY = "necly-report-issue-hidden-at";

// Poin 12: setiap halaman punya pintasan laporan kendala. Panelnya bisa ditutup
// supaya tidak menutupi konten, dan setelah ditutup tombolnya tetap tersedia.
export function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  const [nearFooter, setNearFooter] = useState(false);
  const [userHidden, setUserHidden] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Membaca localStorage hanya boleh terjadi sekali di klien. Tanpa penjaga ini
  // efek scroll di bawah akan menghapus timer sembunyi setiap kali user
  // menggulir, sehingga tombol muncul lagi jauh sebelum 5 menit.
  const restoreCheckedRef = useRef(false);

  // Baris 23: di bagian paling bawah tombol ini menutupi tautan footer, jadi
  // disembunyikan selama footer hampir terlihat. Panel yang sedang terbuka tidak
  // ikut disembunyikan supaya user tidak kehilangan konteks.
  // Pengukuran sengaja dijalankan langsung (tanpa requestAnimationFrame): hanya
  // membaca tiga nilai dan setState dengan nilai sama tidak memicu render ulang,
  // sehingga throttle tambahan justru menyulitkan pengujian tanpa manfaat nyata.
  useEffect(() => {
    const measure = () => {
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
      setNearFooter(remaining <= FOOTER_CLEARANCE);
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Baris 132: tombol bisa disembunyikan user, lalu kembali setelah 5 menit.
  // Waktu tutup disimpan di localStorage supaya konsisten antar navigasi, dan
  // sisa waktunya dihitung dari Date.now() — bukan dari durasi timer — agar
  // reload di tengah periode sembunyi tidak memperpanjang atau memotongnya.
  useEffect(() => {
    if (restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const elapsed = Date.now() - Number(stored);
        if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < HIDE_DURATION) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setUserHidden(true);
          timer = setTimeout(() => {
            setUserHidden(false);
            try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
          }, HIDE_DURATION - elapsed);
          hideTimerRef.current = timer;
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // localStorage bisa dilarang (mode privat ketat); tombol tetap tampil.
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (hideTimerRef.current === timer) hideTimerRef.current = null;
    };
  }, []);

  const handleHideButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserHidden(true);
    setOpen(false);
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // ignore
    }
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    const timer = setTimeout(() => {
      setUserHidden(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }, HIDE_DURATION);
    hideTimerRef.current = timer;
  };

  return (
    <div className={`report-issue ${open ? "is-open" : ""} ${nearFooter && !open ? "is-hidden" : ""} ${userHidden ? "is-user-hidden" : ""}`}>
      {!userHidden && open && (
        <div className="report-issue-panel" role="dialog" aria-label="Pilih kanal laporan kendala">
          <header>
            <strong>Lapor Kendala</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup panel laporan kendala"><X size={15} /></button>
          </header>
          <p>Ada kendala pada pesanan atau akses? Pilih kanal yang paling nyaman.</p>
          <a className="report-issue-option is-wa" href={whatsappLink("Halo Necly Services, saya ingin melaporkan kendala.")} target="_blank" rel="noreferrer"><MessageCircle size={17} /><span><strong>WhatsApp</strong><small>{contact.whatsappLabel}</small></span></a>
          <a className="report-issue-option" href={`mailto:${contact.email}`}><Mail size={17} /><span><strong>Email</strong><small>{contact.email}</small></span></a>
          <Link className="report-issue-option is-form" href="/laporan-kendala" onClick={() => setOpen(false)}><LifeBuoy size={17} /><span><strong>Formulir laporan</strong><small>Sertakan nomor pesanan</small></span></Link>
        </div>
      )}
      {!userHidden && (
        <div className="report-issue-trigger-wrapper">
          <button type="button" className="report-issue-trigger" aria-expanded={open} aria-label={open ? "Tutup laporan kendala" : "Buka laporan kendala"} onClick={() => setOpen(!open)}>
            {open ? <X size={19} /> : <LifeBuoy size={21} />}
            <span>{open ? "Tutup" : "Lapor Kendala"}</span>
          </button>
          {!open && (
            <button
              type="button"
              className="report-issue-close-button"
              onClick={handleHideButton}
              aria-label="Sembunyikan tombol laporan kendala selama 5 menit"
              tabIndex={0}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}