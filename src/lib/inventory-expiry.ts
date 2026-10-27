const DAY_MS = 24 * 60 * 60 * 1000;

export const MAX_INVENTORY_EXTENSION_DAYS = 3650;

export type InventoryExpiryState = "unlimited" | "expired" | "expiring" | "safe";
export type InventoryExpiryMarker = "H-7" | "H-1" | null;

export type InventoryExpiry = {
  state: InventoryExpiryState;
  expired: boolean;
  daysRemaining: number | null;
  marker: InventoryExpiryMarker;
  label: string;
};

/**
 * Menentukan status tampilan masa aktif dari kontrak backend NEC-137.
 *
 * `days_remaining` dipakai lebih dulu karena backend sudah membulatkan ke atas
 * dan memberi `null` untuk masa aktif tanpa batas. Bila field itu tidak ada
 * (misalnya respons lama), tanggal `expires_at` dihitung dengan pembulatan yang
 * sama supaya penanda H-7/H-1 tetap konsisten.
 */
export function resolveInventoryExpiry({
  expiresAt,
  status,
  daysRemaining,
  now = Date.now(),
}: {
  expiresAt?: string | null;
  status?: string | null;
  daysRemaining?: number | null;
  now?: number;
}): InventoryExpiry {
  let days =
    typeof daysRemaining === "number" && Number.isFinite(daysRemaining)
      ? Math.max(0, Math.ceil(daysRemaining))
      : null;

  const expiryTime = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  const hasValidExpiry = Number.isFinite(expiryTime);
  if (days === null && hasValidExpiry) {
    days = Math.max(0, Math.ceil((expiryTime - now) / DAY_MS));
  }

  if (status === "expired" || (hasValidExpiry && expiryTime < now)) {
    return {
      state: "expired",
      expired: true,
      daysRemaining: days ?? 0,
      marker: null,
      label: "Kedaluwarsa",
    };
  }

  if (days === null) {
    return {
      state: "unlimited",
      expired: false,
      daysRemaining: null,
      marker: null,
      label: "Tanpa batas",
    };
  }

  if (days <= 7) {
    return {
      state: "expiring",
      expired: false,
      daysRemaining: days,
      marker: days <= 1 ? "H-1" : "H-7",
      label: days === 0 ? "Hari ini" : `${days} hari lagi`,
    };
  }

  return {
    state: "safe",
    expired: false,
    daysRemaining: days,
    marker: null,
    label: `${days} hari lagi`,
  };
}

/** Durasi perpanjangan harus bilangan bulat 1–3650 hari. */
export function parseExtensionDuration(value: string): number | null {
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) return null;
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 1 || days > MAX_INVENTORY_EXTENSION_DAYS) return null;
  return days;
}

export function buildSlotExtensionPayload(durationDays: number): { duration_days: number } | null {
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > MAX_INVENTORY_EXTENSION_DAYS) {
    return null;
  }
  return { duration_days: durationDays };
}

/**
 * Payload perpanjangan akun hanya boleh berisi satu sumber waktu. `duration_days`
 * dihitung backend dari `max(now, expiry lama)`; `expires_at` harus tanggal yang
 * valid dan akan ditolak backend bila tidak memindahkan masa aktif ke depan.
 */
export function buildAccountExtensionPayload(input: {
  durationDays?: number | null;
  expiresAt?: string | null;
}): { duration_days: number } | { expires_at: string } | null {
  if (typeof input.durationDays === "number") {
    const byDuration = buildSlotExtensionPayload(input.durationDays);
    if (byDuration) return byDuration;
  }

  const rawExpiry = input.expiresAt?.trim();
  if (!rawExpiry) return null;
  const expiry = new Date(rawExpiry);
  if (Number.isNaN(expiry.getTime())) return null;
  return { expires_at: expiry.toISOString() };
}
