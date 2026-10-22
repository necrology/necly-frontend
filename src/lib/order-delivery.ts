import {
  apiErrorCode,
  type ApiDeliveryAccountOption,
  type ApiDeliveryAssignedAccount,
  type ApiOrder,
  type ApiOrderDelivery,
} from "./api";

/**
 * Kode error delivery berasal dari backend dan tidak boleh diterjemahkan
 * menjadi pesan generik. Setiap kode membawa panduan tindakan yang bisa
 * langsung dijalankan admin.
 */
export type DeliveryErrorGuidance = {
  label: string;
  action: string;
};

const deliveryErrorGuidance: Record<string, DeliveryErrorGuidance> = {
  account_full: {
    label: "Akun penuh",
    action: "Pilih akun lain yang masih punya slot, atau tambah akun inventaris baru.",
  },
  account_unavailable: {
    label: "Akun tidak tersedia",
    action: "Pilih akun yang aktif dan belum kedaluwarsa.",
  },
  no_alternative_account: {
    label: "Tidak ada akun alternatif",
    action: "Semua akun sudah dipakai pembeli ini untuk produk yang sama. Tambah akun baru lalu kirim ulang.",
  },
  account_not_expired: {
    label: "Masa akses lama masih aktif",
    action: "Ganti akun hanya setelah masa akses habis, atau centang komplain yang sudah disetujui.",
  },
  account_used_by_customer: {
    label: "Akun sudah dipakai pembeli ini",
    action: "Pilih akun lain yang belum pernah diterima pembeli untuk produk ini.",
  },
  account_mismatch: {
    label: "Akun bukan untuk produk ini",
    action: "Pilih akun yang terhubung ke produk pada item pesanan.",
  },
  delivery_already_sent: {
    label: "Pengiriman sudah terkirim",
    action: "Muat ulang pesanan. Gunakan Ganti akun bila pembeli membutuhkan akun baru.",
  },
  delivery_not_sent: {
    label: "Pengiriman belum terkirim",
    action: "Kirim akun terlebih dahulu sebelum melakukan penggantian.",
  },
  duration_unavailable: {
    label: "Durasi paket tidak tersedia",
    action: "Lengkapi durasi pada paket produk, lalu kirim ulang pengiriman.",
  },
  replacement_email_failed: {
    label: "Email pengganti gagal dikirim",
    action: "Periksa konfigurasi email, lalu ulangi penggantian setelah slot lama tetap expired.",
  },
  buyer_email_unverified: {
    label: "Email pembeli belum terverifikasi",
    action: "Minta pembeli memverifikasi email sebelum pengiriman.",
  },
  buyer_unavailable: {
    label: "Pembeli tidak tersedia",
    action: "Periksa data pembeli sebelum mengirim ulang.",
  },
  mailer_disabled: {
    label: "Pengiriman email belum dikonfigurasi",
    action: "Aktifkan konfigurasi email server sebelum mengirim akun.",
  },
  credential_cipher_unavailable: {
    label: "Kunci kredensial tidak tersedia",
    action: "Periksa konfigurasi kunci kredensial server.",
  },
  inventory_unavailable: {
    label: "Inventaris tidak tersedia",
    action: "Tambahkan akun dan slot untuk produk ini.",
  },
  inventory_account_unavailable: {
    label: "Akun inventaris tidak tersedia",
    action: "Pilih atau tambahkan akun inventaris yang aktif.",
  },
  credential_invalid: {
    label: "Format kredensial inventaris tidak valid",
    action: "Perbaiki data akun di inventaris, lalu kirim ulang.",
  },
  email_failed: {
    label: "Email gagal dikirim",
    action: "Periksa konfigurasi email lalu ulangi pengiriman.",
  },
  persistence_failed: {
    label: "Gagal menyimpan status pengiriman",
    action: "Coba lagi; bila berulang, periksa log server.",
  },
  order_not_approved: {
    label: "Pesanan belum disetujui untuk dikirim",
    action: "Setujui pembayaran/pengiriman terlebih dahulu.",
  },
  invalid_transition: {
    label: "Status pesanan tidak mendukung aksi ini",
    action: "Muat ulang pesanan dan gunakan aksi yang sesuai dengan status terbaru.",
  },
  invalid_input: {
    label: "Data penggantian tidak valid",
    action: "Pilih akun pengganti dan isi alasan maksimal 500 karakter.",
  },
};

export function deliveryErrorGuidanceFor(code?: string | null): DeliveryErrorGuidance | null {
  if (!code) return null;
  return deliveryErrorGuidance[code] ?? { label: code, action: "Periksa status pesanan lalu coba lagi." };
}

/** Map error API menjadi label kode + panduan tindakan yang bisa dibaca admin. */
export function describeDeliveryFailure(error: unknown, fallback: string): { message: string; guidance: string } {
  const code = apiErrorCode(error);
  const guidance = deliveryErrorGuidanceFor(code);
  if (guidance) {
    return { message: `${guidance.label} (${code}).`, guidance: guidance.action };
  }
  if (error instanceof Error && error.message) {
    return { message: error.message, guidance: fallback };
  }
  return { message: fallback, guidance: "" };
}

const paidStatuses = new Set(["paid", "settled", "captured", "succeeded", "success", "completed", "confirmed", "lunas"]);

export type OrderPaymentSummary = {
  status: string;
  paid: boolean;
  label: string;
  method: string | null;
  paidAt: string | null;
  hasPayment: boolean;
};

const paymentStatusLabels: Record<string, string> = {
  pending: "Belum dibayar",
  pending_payment: "Belum dibayar",
  waiting: "Belum dibayar",
  paid: "Sudah dibayar",
  settled: "Sudah dibayar",
  captured: "Sudah dibayar",
  succeeded: "Sudah dibayar",
  success: "Sudah dibayar",
  completed: "Sudah dibayar",
  confirmed: "Sudah dibayar",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  failed: "Gagal",
  refunded: "Dikembalikan",
};

const paymentMethodLabels: Record<string, string> = {
  xendit: "Xendit",
  midtrans: "Midtrans",
  manual: "Transfer manual",
  bank_transfer: "Transfer bank",
  virtual_account: "Virtual account",
};

/** Ringkasan pembayaran memakai `payment_status` admin bila tersedia. */
export function summarizeOrderPayment(order: ApiOrder): OrderPaymentSummary {
  const payments = [...(order.payments ?? [])].sort((left, right) => {
    const leftTime = left.paid_at ?? left.created_at ?? "";
    const rightTime = right.paid_at ?? right.created_at ?? "";
    return rightTime.localeCompare(leftTime);
  });
  const latest = payments[0];
  const status = (order.payment_status ?? latest?.status ?? "").trim().toLowerCase();
  const paid = paidStatuses.has(status);
  return {
    status,
    paid,
    label: status
      ? paymentStatusLabels[status] ?? (paid ? "Sudah dibayar" : "Belum dibayar")
      : "Belum ada pembayaran",
    method: latest?.provider
      ? paymentMethodLabels[latest.provider.toLowerCase()] ?? latest.provider
      : null,
    paidAt: latest?.paid_at ?? null,
    hasPayment: payments.length > 0,
  };
}

export type DeliverySummary = {
  label: string;
  tone: "status-success" | "status-warning" | "status-danger" | "status-info";
  sent: number;
  total: number;
  failed: number;
};

export function summarizeDeliveries(deliveries: ApiOrderDelivery[]): DeliverySummary {
  const total = deliveries.length;
  const sent = deliveries.filter((delivery) => delivery.status === "sent").length;
  const failed = deliveries.filter((delivery) => delivery.status === "failed").length;
  if (total === 0) {
    return { label: "Belum ada pengiriman", tone: "status-info", sent, total, failed };
  }
  if (sent === total) {
    return { label: "Semua akun terkirim", tone: "status-success", sent, total, failed };
  }
  if (failed > 0) {
    return { label: "Ada pengiriman gagal", tone: "status-danger", sent, total, failed };
  }
  if (sent > 0) {
    return { label: "Terkirim sebagian", tone: "status-warning", sent, total, failed };
  }
  return { label: "Menunggu pengiriman", tone: "status-warning", sent, total, failed };
}

function isPast(value: string | null | undefined, now: Date) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() <= now.getTime();
}

export function accessIsExpired(accounts: ApiDeliveryAssignedAccount[] | undefined, now: Date = new Date()) {
  return (accounts ?? []).some(
    (account) => account.days_remaining === 0 || isPast(account.access_expires_at, now),
  );
}

/**
 * Tombol Ganti akun hanya untuk delivery yang sudah terkirim dan bermasalah:
 * masa akses habis, ada error pengiriman, atau email pengganti sebelumnya
 * gagal. Delivery yang belum terkirim memakai alur Kirim/Ulangi.
 */
export function deliveryNeedsReplacement(delivery: ApiOrderDelivery, now: Date = new Date()) {
  if (delivery.status !== "sent") return false;
  if (delivery.error_code) return true;
  if ((delivery.replacements ?? []).some((replacement) => replacement.status === "failed")) return true;
  return accessIsExpired(delivery.assigned_accounts, now);
}

/** Alasan sebuah akun tidak bisa dipilih, atau `null` bila bisa dipilih. */
export function accountDisabledReason(
  account: ApiDeliveryAccountOption,
  quantity: number,
): string | null {
  if (account.used_by_customer) return "Sudah dipakai user ini";
  if (!account.can_assign) {
    if (account.remaining_slots <= 0) return "Kapasitas penuh";
    if (quantity > account.sharing_limit) return `Jumlah melebihi kapasitas ${account.sharing_limit} user`;
    return "Tidak dapat dipilih";
  }
  return null;
}

/** Label pemakaian akun, selalu menampilkan batas berbagi yang berlaku. */
export function accountUsageLabel(account: ApiDeliveryAccountOption) {
  return `${account.used_slots}/${account.sharing_limit}`;
}

export function remainingAccessLabel(account: ApiDeliveryAssignedAccount) {
  if (account.days_remaining === null || account.days_remaining === undefined) return "Belum aktif";
  if (account.days_remaining <= 0) return "Masa akses habis";
  return `Sisa ${account.days_remaining} hari`;
}

export function replacementStatusLabel(status?: string | null) {
  switch (status) {
    case "sent":
      return "Email terkirim";
    case "failed":
      return "Email gagal";
    case "sending":
      return "Sedang dikirim";
    case "pending":
      return "Menunggu email";
    default:
      return "Status email tidak tersedia";
  }
}

export function replacementStatusTone(status?: string | null) {
  if (status === "sent") return "status-success";
  if (status === "failed") return "status-danger";
  return "status-warning";
}
