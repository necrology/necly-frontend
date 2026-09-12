"use client";

import { Clock3, Flame } from "lucide-react";
import { useEffect, useState } from "react";

const initialSeconds = 170 * 60 * 60 + 8 * 60 + 25;

export function CommerceOfferBanner() {
  const [remaining, setRemaining] = useState(initialSeconds);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((seconds) => seconds > 0 ? seconds - 1 : initialSeconds), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const values = [Math.floor(remaining / 3600), Math.floor((remaining % 3600) / 60), remaining % 60];
  const labels = ["Jam", "Menit", "Detik"];

  return (
    <section className="commerce-offer-banner" aria-label="Penawaran spesial hari ini">
      <div className="commerce-offer-copy"><Flame size={31} fill="currentColor" /><div><strong>Penawaran Spesial Hari Ini!</strong><span>Dapatkan harga terbaik untuk berbagai layanan premium favorit kamu.</span></div></div>
      <div className="commerce-offer-countdown"><Clock3 size={20} /><span>Berakhir dalam:</span><div className="commerce-time-values">{values.map((value, index) => <div className="commerce-time-value" key={labels[index]}><b>{String(value).padStart(2, "0")}</b><small>{labels[index]}</small>{index < 2 && <i>:</i>}</div>)}</div></div>
    </section>
  );
}
