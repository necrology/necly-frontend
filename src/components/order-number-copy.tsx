"use client";

import { Check, ClipboardCopy } from "lucide-react";
import { useState } from "react";

type OrderNumberCopyProps = {
  number: string;
  className?: string;
};

/** Nomor pesanan tetap berupa teks biasa agar dapat disalin manual bila Clipboard API tidak tersedia. */
export function OrderNumberCopy({ number, className }: OrderNumberCopyProps) {
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);

  const copy = async () => {
    setFeedback(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API tidak tersedia");
      await navigator.clipboard.writeText(number);
      setFeedback("success");
    } catch {
      setFeedback("error");
    }
  };

  return (
    <div className={className}>
      <div className="order-number-copy-value">
        <strong>{number}</strong>
        <button
          className="button button-secondary button-sm"
          type="button"
          onClick={() => void copy()}
          aria-label={`Salin nomor pesanan ${number}`}
        >
          {feedback === "success" ? <><Check size={14} aria-hidden="true" /> Tersalin</> : <><ClipboardCopy size={14} aria-hidden="true" /> Salin nomor</>}
        </button>
      </div>
      <p className="muted small" style={{ margin: "7px 0 0" }}>
        Salin nomor ini saat membuat Laporan Kendala agar tim dapat menemukan pesanan Anda.
      </p>
      {feedback === "success" && <p className="order-copy-feedback" role="status">Nomor pesanan berhasil disalin.</p>}
      {feedback === "error" && <p className="field-error" role="alert">Nomor tidak dapat disalin otomatis. Pilih dan salin nomor pesanan secara manual.</p>}
    </div>
  );
}
