"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

// Tombol muncul setelah user melewati satu layar penuh, supaya tidak menutupi
// konten di bagian atas halaman (permintaan QA poin 16).
const visibleAfter = 480;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const syncVisibility = () => setVisible(window.scrollY > visibleAfter);
    syncVisibility();
    window.addEventListener("scroll", syncVisibility, { passive: true });
    return () => window.removeEventListener("scroll", syncVisibility);
  }, []);

  return (
    <button
      type="button"
      className={`back-to-top ${visible ? "is-visible" : ""}`}
      aria-label="Kembali ke atas"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp size={20} />
    </button>
  );
}
