"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="container section"><div className="empty-state"><AlertTriangle size={30}/><span className="eyebrow">Halaman mengalami gangguan</span><h1 className="h2">Data Anda tetap tersimpan.</h1><p className="muted">Muat ulang halaman ini. Jika gangguan berlanjut, kembali ke katalog.</p><button className="button button-primary" type="button" onClick={reset}><RotateCcw size={14}/> Coba lagi</button></div></main>;
}
