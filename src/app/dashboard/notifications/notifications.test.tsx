import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listNotificationsMock, bootstrapAuthMock } = vi.hoisted(() => ({
  listNotificationsMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: { ...actual.adminApi, listNotifications: listNotificationsMock },
  };
});

import NotificationsPage from "./page";

const LOG = {
  id: "0192f0d0-0000-0000-0000-000000000001",
  actor_user_id: "0192f0c0-0000-0000-0000-000000000001",
  actor_user: { id: "0192f0c0-0000-0000-0000-000000000001", name: "Admin Fixture", email: "admin@example.test", role: "admin" },
  action: "admin.order.delivery_sent",
  resource_type: "order",
  resource_id: "0192f0b0-0000-0000-0000-000000000001",
  ip_address: "203.0.113.10",
  metadata: null,
  created_at: "2026-10-18T09:00:00Z",
};

const SECOND_LOG = {
  ...LOG,
  id: "0192f0d0-0000-0000-0000-000000000002",
  action: "admin.inventory.updated",
  resource_type: "inventory_account",
  resource_id: "0192f0f0-0000-0000-0000-000000000001",
};

describe("notifikasi admin (W18)", () => {
  beforeEach(() => {
    listNotificationsMock.mockReset();
    bootstrapAuthMock.mockReset().mockResolvedValue({ id: "admin-1", role: "admin" });
    listNotificationsMock.mockResolvedValue({ notifications: [LOG], page: 1, per_page: 50, total: 1 });
  });

  it("memakai endpoint /admin/notifications dan menandai data sebagai aktivitas tercatat", async () => {
    render(<NotificationsPage />);

    expect(await screen.findByText("admin.order.delivery_sent")).toBeInTheDocument();
    expect(screen.getAllByText("Pesanan").length).toBeGreaterThan(0);
    expect(screen.getByText("Tercatat")).toBeInTheDocument();
    expect(listNotificationsMock).toHaveBeenCalledWith({ page: 1, per_page: 50 });
    expect(screen.queryByText(/tandai semua dibaca/i)).not.toBeInTheDocument();
  });

  it("memuat aktivitas berikutnya dan menampilkan jumlah termuat dari total", async () => {
    listNotificationsMock
      .mockReset()
      .mockResolvedValueOnce({ notifications: [LOG], page: 1, per_page: 50, total: 120 })
      .mockResolvedValue({ notifications: [SECOND_LOG], page: 2, per_page: 50, total: 120 });
    render(<NotificationsPage />);

    expect(await screen.findByText("admin.order.delivery_sent")).toBeInTheDocument();
    expect(screen.getByText("1 dari 120 aktivitas dimuat")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Muat lebih banyak notifikasi" }));

    expect(await screen.findByText("admin.inventory.updated")).toBeInTheDocument();
    expect(listNotificationsMock).toHaveBeenLastCalledWith({ page: 2, per_page: 50 });
    expect(screen.getByText("2 dari 120 aktivitas dimuat")).toBeInTheDocument();
  });

  it("menampilkan keadaan kosong yang sah", async () => {
    listNotificationsMock.mockResolvedValue({ notifications: [], page: 1, per_page: 50, total: 0 });
    render(<NotificationsPage />);

    expect(await screen.findByText("Belum ada notifikasi.")).toBeInTheDocument();
  });

  it("menolak respons yang tidak sesuai kontrak", async () => {
    listNotificationsMock.mockResolvedValue({ logs: [LOG], page: 1, per_page: 50, total: 1 });
    render(<NotificationsPage />);

    expect(await screen.findByText(/tidak sesuai kontrak/)).toBeInTheDocument();
  });
});
