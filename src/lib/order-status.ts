export type OrderStatus = "pending_payment" | "confirmed" | "in_progress" | "delivered" | "cancelled";
export type StepState = "complete" | "current" | "upcoming" | "cancelled";

const standardSteps = ["Pesanan dibuat", "Pembayaran dikonfirmasi", "Sedang diproses", "Akses diterima"] as const;
const statusIndex: Record<Exclude<OrderStatus, "cancelled">, number> = {
  pending_payment: 0,
  confirmed: 1,
  in_progress: 2,
  delivered: 3,
};

export function getOrderSteps(status: OrderStatus): { label: string; state: StepState }[] {
  if (status === "cancelled") {
    return [
      { label: "Pesanan dibuat", state: "complete" },
      { label: "Dibatalkan", state: "cancelled" },
    ];
  }

  const activeIndex = statusIndex[status];
  return standardSteps.map((label, index) => ({
    label,
    state: index < activeIndex ? "complete" : index === activeIndex ? "current" : "upcoming",
  }));
}
