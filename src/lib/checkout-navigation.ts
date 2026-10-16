import type { CheckoutResponse } from "@/lib/api";

/**
 * Continue to the URL returned by the payment provider. Internal fallback URLs
 * stay on the Next.js router; hosted checkouts require a full-page navigation.
 */
export function continueToCheckout(response: CheckoutResponse, push: (href: string) => void) {
  const fallback = `/payment/${encodeURIComponent(response.order.id)}`;
  const target = response.checkout_url?.trim() || response.payment.checkout_url?.trim() || fallback;

  if (target.startsWith("/")) {
    push(target);
    return;
  }

  let checkoutURL: URL;
  try {
    checkoutURL = new URL(target);
  } catch {
    throw new Error("Tautan pembayaran dari penyedia tidak valid.");
  }

  if (checkoutURL.protocol !== "https:") {
    throw new Error("Tautan pembayaran harus menggunakan koneksi HTTPS.");
  }

  window.location.assign(checkoutURL.toString());
}
