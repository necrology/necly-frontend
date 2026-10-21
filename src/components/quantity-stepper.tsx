"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  value: number;
  onChange: (next: number) => void;
  /** Jumlah terendah yang boleh dipilih. */
  min?: number;
  /** Jumlah tertinggi yang boleh dipilih, biasanya stok paket. */
  max?: number;
  /** Nama produk untuk melengkapi label pembaca layar. */
  itemName?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Pengubah jumlah dengan tombol minus/plus yang dipakai bersama.
 *
 * Ikon sebelumnya menempel di kiri tombol karena tombol berada di flex dan
 * ikonnya `display: block` tanpa perataan. Komponen ini memusatkan ikon,
 * menegakkan batas min/max, dan memberi label aksesibilitas yang konsisten.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = Number.POSITIVE_INFINITY,
  itemName,
  disabled = false,
  className,
}: QuantityStepperProps) {
  const suffix = itemName ? ` ${itemName}` : "";
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className={cn("quantity", className)} role="group" aria-label={`Jumlah${suffix}`}>
      <button
        type="button"
        className="quantity-button"
        aria-label={`Kurangi jumlah${suffix}`}
        disabled={disabled || atMin}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={14} strokeWidth={2.5} aria-hidden="true" />
      </button>
      <span className="quantity-value" aria-live="polite" aria-atomic="true">{value}</span>
      <button
        type="button"
        className="quantity-button"
        aria-label={`Tambah jumlah${suffix}`}
        disabled={disabled || atMax}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
