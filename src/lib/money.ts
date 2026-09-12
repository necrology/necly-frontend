export type PricedItem = { price: number; quantity: number };

export function formatIDR(value: number): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
  return `Rp${formatted}`;
}

/** Storefront price label: "Rp 81.500" (spaced), matching the public catalog design. */
export function formatRupiahLabel(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatDateID(value: string): string {
  // Handle ISO dates or already formatted dates
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return value;
  }
}

export function formatDateTimeID(value: string): string {
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return value;
  }
}

export function cartTotals(items: readonly PricedItem[], discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const safeDiscount = Math.min(Math.max(discount, 0), subtotal);
  const serviceFee = Math.round((subtotal - safeDiscount) * 0.025);

  return {
    subtotal,
    discount: safeDiscount,
    serviceFee,
    total: subtotal - safeDiscount + serviceFee,
  };
}
