/**
 * Perhitungan harga patungan NEC-136. Rumus ini harus sama dengan
 * internal/service/admin_product_price.go supaya pratinjau di form admin
 * identik dengan harga yang disimpan backend.
 *
 * total   = baseAmount + adminFee
 * pembagi = memberSlots + (adminIncluded ? 1 : 0)
 * perSlot = ceil(total / pembagi / 1000) * 1000
 */
export const PRICE_ROUND_INCREMENT = 1000;

export type PriceBreakdown = {
  total: number;
  divisor: number;
  perSlot: number;
  totalBilledToMembers: number;
};

export function calculatePriceBreakdown(
  baseAmount: number,
  adminFee: number,
  memberSlots: number,
  adminIncluded: boolean,
): PriceBreakdown {
  const safeBase = Number.isFinite(baseAmount) && baseAmount > 0 ? Math.floor(baseAmount) : 0;
  const safeFee = Number.isFinite(adminFee) && adminFee > 0 ? Math.floor(adminFee) : 0;
  const safeSlots = Number.isFinite(memberSlots) && memberSlots > 0 ? Math.floor(memberSlots) : 0;
  const total = safeBase + safeFee;
  const divisor = safeSlots + (adminIncluded ? 1 : 0);
  if (total <= 0 || divisor <= 0) {
    return { total, divisor, perSlot: 0, totalBilledToMembers: 0 };
  }
  const step = divisor * PRICE_ROUND_INCREMENT;
  const perSlot = Math.ceil(total / step) * PRICE_ROUND_INCREMENT;
  return {
    total,
    divisor,
    perSlot,
    totalBilledToMembers: perSlot * (safeSlots || divisor),
  };
}
