import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

import { useAuthStore } from "@/lib/api";
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
  });

  afterEach(() => {
    setViewportWidth(1024);
    useDashboardUiStore.setState({ sidebarCollapsed: false, mobileSidebarOpen: false });
    useAuthStore.getState().clearAuth();
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
