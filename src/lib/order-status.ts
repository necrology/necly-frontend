/** Semua status order backend (W0 C-02) plus alias lama data contoh. */
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "fulfilling"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "expired"
  | "refunded"
  // Alias yang masih dipakai data demo lama.
  | "confirmed"
  | "in_progress";

export type StepState = "complete" | "current" | "upcoming" | "cancelled";

const standardSteps = ["Pesanan dibuat", "Pembayaran dikonfirmasi", "Sedang diproses", "Akses diterima"] as const;

const terminalLabels: Partial<Record<OrderStatus, string>> = {
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  refunded: "Dikembalikan",
};

/**
 * Posisi timeline untuk setiap status backend. `paid` menuntaskan langkah
 * pembuatan pesanan dan menandai pembayaran sebagai tahap aktif; keluarga
 * fulfilled (fulfilling/processing/shipped) berada di tahap pemrosesan.
 */
const statusIndex: Partial<Record<OrderStatus, number>> = {
  pending_payment: 0,
  paid: 1,
  confirmed: 1,
  fulfilling: 2,
  processing: 2,
  in_progress: 2,
  shipped: 2,
  delivered: 3,
  completed: 4,
};

export function normalizeOrderStatus(status: string): OrderStatus | null {
  const normalized = status.trim().toLocaleLowerCase("id-ID").replace(/[\s-]+/g, "_");
  return Object.hasOwn(statusIndex, normalized) || Object.hasOwn(terminalLabels, normalized)
    ? (normalized as OrderStatus)
    : null;
}

export function orderStatusLabel(status: string): string {
  const normalized = normalizeOrderStatus(status);
  if (!normalized) return "Status lainnya";
  switch (normalized) {
    case "cancelled": return "Dibatalkan";
    case "expired": return "Kedaluwarsa";
    case "refunded": return "Dikembalikan";
    case "pending_payment": return "Menunggu pembayaran";
    case "paid":
    case "confirmed": return "Dibayar";
    case "fulfilling":
    case "processing":
    case "in_progress": return "Diproses";
    case "shipped": return "Dikirim";
    case "delivered": return "Akses diterima";
    case "completed": return "Selesai";
    default: return "Status lainnya";
  }
}

export function getOrderSteps(status: OrderStatus): { label: string; state: StepState }[] {
  const terminal = terminalLabels[status];
  if (terminal) {
    return [
      { label: "Pesanan dibuat", state: "complete" },
      { label: terminal, state: "cancelled" },
    ];
  }

  const activeIndex = statusIndex[status] ?? 0;
  return standardSteps.map((label, index) => ({
    label,
    state: index < activeIndex ? "complete" : index === activeIndex ? "current" : "upcoming",
  }));
}
