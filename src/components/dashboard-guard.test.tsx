import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { bootstrapAuthMock, pushMock, dashboardMock } = vi.hoisted(() => ({
  bootstrapAuthMock: vi.fn(),
  pushMock: vi.fn(),
  dashboardMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  bootstrapAuth: bootstrapAuthMock,
  useAuthStore: { getState: () => ({ user: null }) },
  adminApi: { dashboard: dashboardMock, listOrders: vi.fn() },
}));

import { DashboardGuard } from "./dashboard-guard";
import { adminApi } from "@/lib/api";

function AdminProbe() {
  void adminApi.dashboard();
  return <p>Konten admin</p>;
}

describe("DashboardGuard (C19 admin-only)", () => {
  beforeEach(() => {
    bootstrapAuthMock.mockReset();
    pushMock.mockReset();
    dashboardMock.mockReset();
  });

  it("menolak penjual tanpa memuat konten atau data admin", async () => {
    bootstrapAuthMock.mockResolvedValue({ id: "seller-1", role: "seller" });
    render(<DashboardGuard><AdminProbe /></DashboardGuard>);

    await waitFor(() => expect(screen.getByText("Akses ditolak")).toBeInTheDocument());
    expect(screen.queryByText("Konten admin")).not.toBeInTheDocument();
    expect(dashboardMock).not.toHaveBeenCalled();
  });

  it("menolak pelanggan tanpa memuat data admin", async () => {
    bootstrapAuthMock.mockResolvedValue({ id: "customer-1", role: "customer" });
    render(<DashboardGuard><AdminProbe /></DashboardGuard>);

    await waitFor(() => expect(screen.getByText("Akses ditolak")).toBeInTheDocument());
    expect(dashboardMock).not.toHaveBeenCalled();
  });

  it("mengizinkan admin melihat konten", async () => {
    bootstrapAuthMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    render(<DashboardGuard><AdminProbe /></DashboardGuard>);

    await waitFor(() => expect(screen.getByText("Konten admin")).toBeInTheDocument());
    expect(screen.queryByText("Akses ditolak")).not.toBeInTheDocument();
  });

  it("mengarahkan sesi tanpa pengguna ke login", async () => {
    bootstrapAuthMock.mockResolvedValue(null);
    render(<DashboardGuard><AdminProbe /></DashboardGuard>);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login?redirect=%2Fdashboard"));
    expect(screen.queryByText("Konten admin")).not.toBeInTheDocument();
    expect(dashboardMock).not.toHaveBeenCalled();
  });
});
