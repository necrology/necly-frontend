"use client";

import { LifeBuoy, Mail, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { contact, whatsappLink } from "@/data/contact";

// Poin 12: setiap halaman punya pintasan laporan kendala. Panelnya bisa ditutup
// supaya tidak menutupi konten, dan setelah ditutup tombolnya tetap tersedia.
export function ReportIssueButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`report-issue ${open ? "is-open" : ""}`}>
      {open && (
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
      <button type="button" className="report-issue-trigger" aria-expanded={open} aria-label={open ? "Tutup laporan kendala" : "Buka laporan kendala"} onClick={() => setOpen(!open)}>
        {open ? <X size={19} /> : <LifeBuoy size={21} />}
        <span>{open ? "Tutup" : "Lapor Kendala"}</span>
      </button>
    </div>
  );
}
