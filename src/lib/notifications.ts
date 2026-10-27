import type { ApiAuditLog } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";

/**
 * Backend memproyeksikan audit log sebagai notifikasi dan tidak menyimpan
 * status baca. Agar angka di lonceng tetap bermakna, frontend menyimpan waktu
 * terakhir halaman Notifikasi dibuka lalu menghitung entri yang lebih baru.
 */
export const NOTIFICATIONS_SEEN_KEY = "necly-notifications-seen-at";
export const NOTIFICATIONS_SEEN_EVENT = "necly-notifications-seen";
export const NOTIFICATION_PREVIEW_SIZE = 5;
export const NOTIFICATION_FETCH_SIZE = 50;

export const notificationTypeLabels: Record<string, string> = {
  order: "Pesanan",
  inventory: "Inventaris",
  payment: "Pembayaran",
  system: "Sistem",
};

export function notificationType(action: string): NotificationItem["type"] {
  if (action.startsWith("admin.order") || action.startsWith("order.")) return "order";
  if (action.includes("inventory") || action.includes("slot")) return "inventory";
  if (action.includes("payment") || action.includes("refund")) return "payment";
  return "system";
}

/** Bentuk satu baris audit log menjadi item notifikasi yang dipakai UI. */
export function notificationFromAudit(log: ApiAuditLog): NotificationItem {
  const resource = log.resource_id ? `${log.resource_type} · ${log.resource_id}` : log.resource_type;
  return {
    id: log.id,
    title: log.action,
    detail: resource,
    type: notificationType(log.action),
    time: log.created_at,
    read: true,
  };
}

export function readNotificationsSeenAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(NOTIFICATIONS_SEEN_KEY);
  } catch {
    return null;
  }
}

/** Tandai halaman notifikasi sudah dibuka sampai waktu `at` (default sekarang). */
export function markNotificationsSeen(at: string = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFICATIONS_SEEN_KEY, at);
  } catch {
    // localStorage bisa diblokir; lonceng tetap berfungsi tanpa penanda.
    return;
  }
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_SEEN_EVENT, { detail: at }));
}

/**
 * Jumlah notifikasi yang lebih baru dari penanda terakhir. Tanpa penanda,
 * anggap riwayat lama sudah dilihat supaya lonceng tidak menampilkan ratusan
 * entri pada kunjungan pertama.
 */
export function isNewNotification(notification: NotificationItem, seenAt: string | null): boolean {
  if (!seenAt) return false;
  const seenTime = Date.parse(seenAt);
  const created = Date.parse(notification.time);
  return Number.isFinite(seenTime) && Number.isFinite(created) && created > seenTime;
}

export function countNewNotifications(notifications: readonly NotificationItem[], seenAt: string | null): number {
  if (!seenAt) return 0;
  return notifications.reduce(
    (count, notification) => (isNewNotification(notification, seenAt) ? count + 1 : count),
    0,
  );
}

export function notificationBadgeLabel(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}
