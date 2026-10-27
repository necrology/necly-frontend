import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

import { adminApi, useAuthStore } from "@/lib/api";
import { markNotificationsSeen, NOTIFICATIONS_SEEN_KEY } from "@/lib/notifications";
import { useDashboardUiStore } from "@/stores/ui-store";
import { DashboardNav } from "./dashboard-nav";
import { DashboardTopbar } from "./dashboard-topbar";

const user = {
  id: "usr-admin",
  email: "ayu@necly.id",
  name: "Ayu Admin",
  role: "admin" as const,
  emailVerifiedAt: "2026-10-14T00:00:00Z",
  createdAt: "",
  updatedAt: "",
};

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
}

describe("navigasi dashboard", () => {
  beforeEach(() => {
    setViewportWidth(1024);
    useDashboardUiStore.setState({ sidebarCollapsed: false, mobileSidebarOpen: false });
    useAuthStore.setState({ user, accessToken: "token", isAuthenticated: true, isLoading: false });
    window.localStorage.clear();
  });

  afterEach(() => {
    setViewportWidth(1024);
    useDashboardUiStore.setState({ sidebarCollapsed: false, mobileSidebarOpen: false });
    useAuthStore.getState().clearAuth();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("membuka dan menutup drawer lewat tombol hamburger di layar sempit", () => {
    setViewportWidth(390);
    render(<DashboardTopbar />);

    fireEvent.click(screen.getByRole("button", { name: "Buka navigasi dashboard" }));
    expect(useDashboardUiStore.getState().mobileSidebarOpen).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Tutup navigasi dashboard" }));
    expect(useDashboardUiStore.getState().mobileSidebarOpen).toBe(false);
  });

  it("menutup drawer lewat tombol X di sidebar", () => {
    useDashboardUiStore.setState({ mobileSidebarOpen: true });
    render(<DashboardNav />);

    fireEvent.click(screen.getByRole("button", { name: "Tutup navigasi" }));
    expect(useDashboardUiStore.getState().mobileSidebarOpen).toBe(false);
  });

  it("menyembunyikan tombol X sidebar di desktop lewat selector yang lebih spesifik", () => {
    // jsdom tidak menerapkan stylesheet Next, jadi aturan CSS diperiksa dari
    // sumbernya. Regresi NEC-120 terjadi karena `.table-action` setelah
    // `.dashboard-nav-close` menimpa `display: none` di desktop.
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain(".dashboard-sidebar .dashboard-nav-close { display: none; }");
    expect(css).toContain(".dashboard-sidebar .dashboard-nav-close { display: inline-grid; }");
    expect(css).not.toMatch(/(^|\n)\.dashboard-nav-close\s*\{\s*display:\s*none/);
  });

  it("menampilkan angka notifikasi dari entri yang lebih baru, bukan angka tetap", async () => {
    window.localStorage.setItem(NOTIFICATIONS_SEEN_KEY, "2026-10-20T00:00:00Z");
    vi.spyOn(adminApi, "listNotifications").mockResolvedValue({
      notifications: [
        { id: "n-3", action: "admin.order.paid", resource_type: "order", resource_id: "o-3", ip_address: "", created_at: "2026-10-22T10:00:00Z" },
        { id: "n-2", action: "admin.inventory.updated", resource_type: "inventory_account", resource_id: "i-2", ip_address: "", created_at: "2026-10-21T10:00:00Z" },
        { id: "n-1", action: "admin.payment.reconciled", resource_type: "payment", resource_id: "p-1", ip_address: "", created_at: "2026-10-19T10:00:00Z" },
      ],
      page: 1,
      per_page: 50,
      total: 3,
    });

    render(<DashboardTopbar />);

    const bell = screen.getByRole("button", { name: "Notifikasi" });
    await waitFor(() => expect(within(bell).getByTestId("notification-count")).toHaveTextContent("2"));

    fireEvent.click(bell);
    const popover = screen.getByRole("dialog", { name: "Notifikasi terbaru" });
    expect(within(popover).getAllByText("admin.order.paid").length).toBe(1);
    expect(within(popover).getByRole("link", { name: /admin.order.paid/ })).toHaveAttribute("href", "/dashboard/notifications");

    act(() => markNotificationsSeen("2026-10-23T00:00:00Z"));
    await waitFor(() => expect(within(bell).queryByTestId("notification-count")).not.toBeInTheDocument());
  });

  it("tidak menampilkan angka notifikasi saat semua entri sudah dilihat", async () => {
    window.localStorage.setItem(NOTIFICATIONS_SEEN_KEY, "2026-10-23T00:00:00Z");
    vi.spyOn(adminApi, "listNotifications").mockResolvedValue({
      notifications: [
        { id: "n-1", action: "admin.order.paid", resource_type: "order", resource_id: "o-1", ip_address: "", created_at: "2026-10-22T10:00:00Z" },
      ],
      page: 1,
      per_page: 50,
      total: 1,
    });

    render(<DashboardTopbar />);

    const bell = screen.getByRole("button", { name: "Notifikasi" });
    await waitFor(() => expect(adminApi.listNotifications).toHaveBeenCalled());
    expect(within(bell).queryByTestId("notification-count")).not.toBeInTheDocument();
  });

  it("menampilkan menu profil admin dan menutupnya saat klik di luar atau Escape", () => {
    render(<DashboardTopbar />);

    fireEvent.click(screen.getByRole("button", { name: "Menu profil akun" }));
    expect(screen.getByRole("menu", { name: "Menu akun" })).toBeInTheDocument();
    expect(screen.getByText("ayu@necly.id")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Keluar/ })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu", { name: "Menu akun" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Menu profil akun" }));
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("menu", { name: "Menu akun" })).not.toBeInTheDocument();
  });
});
