import { beforeEach, describe, expect, it } from "vitest";
import {
  NOTIFICATIONS_SEEN_KEY,
  countNewNotifications,
  isNewNotification,
  markNotificationsSeen,
  notificationBadgeLabel,
  notificationFromAudit,
  notificationType,
} from "./notifications";
import type { NotificationItem } from "./types";

const item = (id: string, time: string, read = true): NotificationItem => ({
  id,
  title: `Aktivitas ${id}`,
  detail: "order · id",
  type: "order",
  time,
  read,
});

describe("helper notifikasi dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("menghitung hanya notifikasi yang lebih baru dari penanda", () => {
    const rows = [
      item("3", "2026-10-22T10:00:00Z"),
      item("2", "2026-10-21T10:00:00Z"),
      item("1", "2026-10-19T10:00:00Z"),
    ];

    expect(countNewNotifications(rows, "2026-10-20T00:00:00Z")).toBe(2);
    expect(countNewNotifications(rows, null)).toBe(0);
    expect(isNewNotification(rows[0], "2026-10-20T00:00:00Z")).toBe(true);
    expect(isNewNotification(rows[2], "2026-10-20T00:00:00Z")).toBe(false);
  });

  it("membatasi label lencana agar tidak merusak tata letak", () => {
    expect(notificationBadgeLabel(0)).toBe("");
    expect(notificationBadgeLabel(3)).toBe("3");
    expect(notificationBadgeLabel(120)).toBe("99+");
  });

  it("menyimpan dan membaca penanda waktu dilihat", () => {
    markNotificationsSeen("2026-10-22T00:00:00Z");
    expect(localStorage.getItem(NOTIFICATIONS_SEEN_KEY)).toBe("2026-10-22T00:00:00Z");
  });

  it("memetakan audit log menjadi notifikasi dengan jenis yang benar", () => {
    expect(notificationType("admin.order.delivery_sent")).toBe("order");
    expect(notificationType("admin.inventory.updated")).toBe("inventory");
    expect(notificationType("admin.payment.reconciled")).toBe("payment");
    expect(notificationType("auth.login.succeeded")).toBe("system");

    const mapped = notificationFromAudit({
      id: "log-1",
      action: "admin.order.delivery_sent",
      resource_type: "order",
      resource_id: "ord-1",
      ip_address: "",
      created_at: "2026-10-21T10:00:00Z",
    });
    expect(mapped).toMatchObject({
      id: "log-1",
      title: "admin.order.delivery_sent",
      detail: "order · ord-1",
      type: "order",
      time: "2026-10-21T10:00:00Z",
    });
  });
});
