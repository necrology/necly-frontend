export type PaymentChannel =
  | "qris"
  | "ovo"
  | "dana"
  | "shopeepay"
  | "linkaja"
  | "alfamart"
  | "bni_va"
  | "bsi_va"
  | "bri_va"
  | "mandiri_va";

export type PaymentMethod = {
  label: string;
  tone: string;
  channel: PaymentChannel;
};

/**
 * Selector tetap memakai label dan kelas tampilan yang sudah ada. Nilai yang
 * dikirim ke API adalah enum kanonik W0 C-05; bank tidak boleh mengirim
 * "bni"/"bsi"/"bri"/"mandiri" tanpa akhiran _va.
 */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { label: "QRIS", tone: "qris", channel: "qris" },
  { label: "OVO", tone: "ovo", channel: "ovo" },
  { label: "DANA", tone: "dana", channel: "dana" },
  { label: "ShopeePay", tone: "shopeepay", channel: "shopeepay" },
  { label: "LinkAja", tone: "linkaja", channel: "linkaja" },
  { label: "Alfamart", tone: "alfamart", channel: "alfamart" },
  { label: "BNI", tone: "bni", channel: "bni_va" },
  { label: "BSI", tone: "bsi", channel: "bsi_va" },
  { label: "BANK BRI", tone: "bri", channel: "bri_va" },
  { label: "mandiri", tone: "mandiri", channel: "mandiri_va" },
];

export function paymentChannelForLabel(label: string): PaymentChannel {
  return PAYMENT_METHODS.find((method) => method.label === label)?.channel ?? "qris";
}
