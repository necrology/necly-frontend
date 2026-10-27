import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dashboardMock, dashboardAnalyticsMock, listOrdersMock, bootstrapAuthMock } = vi.hoisted(() => ({
  dashboardMock: vi.fn(),
  dashboardAnalyticsMock: vi.fn(),
  listOrdersMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: {
      ...actual.adminApi,
      dashboard: dashboardMock,
      dashboardAnalytics: dashboardAnalyticsMock,
      listOrders: listOrdersMock,
    },
  };
});

import DashboardPage from "./page";

const D1 = {
  total_users: 2,
  total_orders: 1,
  total_revenue: 167400,
  pending_orders: 0,
  active_users: 2,
  new_users_today: 2,
  orders_today: 1,
  revenue_today: 167400,
  active_activations: 1,
  available_slots: 1,
};

const ANALYTICS = {
  range_days: 7,
  from: "2026-10-21",
  to: "2026-10-27",
  revenue_series: [
    { date: "2026-10-21", amount: 150000 },
    { date: "2026-10-22", amount: 225000 },
  ],
  orders_series: [
    { date: "2026-10-21", orders: 3 },
    { date: "2026-10-22", orders: 4 },
  ],
  status_breakdown: [
    { status: "paid", count: 2 },
    { status: "pending_payment", count: 1 },
  ],
  top_products: [
    { product_id: "prd-1", product_name: "Netflix Premium", sales_count: 4, revenue: 744000 },
  ],
  category_breakdown: [
    { category_id: "cat-1", category_name: "Streaming Video", orders: 3, revenue: 600000 },
  ],
};

function apiOrder(number = "ORD-1760832000000-0192f0b0") {
  return {
    id: "0192f0b0-0000-0000-0000-000000000001",
    number,
    status: "paid",
    subtotal: 186000,
    discount: 18600,
    total: 167400,
    currency: "IDR",
    payment_due_at: "2026-10-18T10:15:00Z",
    created_at: "2026-10-18T10:00:00Z",
    updated_at: "2026-10-18T10:00:00Z",
    customer: { id: "cust-1", name: "Fixture Customer", email: "fixture.customer@example.test" },
    items: [{
      id: "item-1",
      product_price_id: "price-1",
      product_name: "Netflix Premium",
      duration_name: "1 Bulan",
      unit_price: 186000,
      quantity: 1,
      device_count: 1,
      line_total: 186000,
    }],
  };
}

function metric(label: string) {
  return screen.getByText(label).closest("article");
}

describe("dashboard admin (C12/C19)", () => {
  beforeEach(() => {
    dashboardMock.mockReset();
    dashboardAnalyticsMock.mockReset();
    listOrdersMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    dashboardMock.mockResolvedValue(D1);
    dashboardAnalyticsMock.mockResolvedValue(ANALYTICS);
    listOrdersMock.mockResolvedValue({ orders: [apiOrder()], page: 1, per_page: 5, total: 1 });
  });

  it("menampilkan metrik D1 persis dan baris dari daftar pesanan", async () => {
    dashboardMock.mockResolvedValue({ ...D1, recent_orders: [apiOrder("ORD-DASHBOARD-INVENTED")] });
    render(<DashboardPage />);

    await waitFor(() => expect(metric("Pendapatan kotor")).toHaveTextContent("Rp167.400"));
    expect(metric("Pesanan baru")).toHaveTextContent("1");
    expect(metric("Aktivasi berjalan")).toHaveTextContent("1");
    expect(metric("Akses tersedia")).toHaveTextContent("1");
    expect(metric("Pendapatan kotor")).toHaveTextContent("—");

    expect(listOrdersMock).toHaveBeenCalledWith({ page: 1, per_page: 5 });
    expect(await screen.findByText("ORD-1760832000000-0192f0b0")).toBeInTheDocument();
    expect(screen.queryByText("ORD-DASHBOARD-INVENTED")).not.toBeInTheDocument();
  });

  it("tidak menampilkan nol saat metrik masih dimuat", async () => {
    dashboardMock.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);

    expect((await screen.findAllByText("Memuat metrik…")).length).toBe(4);
    expect(screen.queryByText("Rp0")).not.toBeInTheDocument();
    expect(metric("Pesanan baru")).toHaveTextContent("—");
  });

  it("memvalidasi seluruh DTO C-06, bukan hanya field yang tampil", async () => {
    const incomplete = { ...D1 } as Record<string, unknown>;
    delete incomplete.total_users;
    dashboardMock.mockResolvedValue(incomplete);
    render(<DashboardPage />);

    expect(await screen.findByText(/Data metrik dashboard dari server tidak lengkap/)).toBeInTheDocument();
  });

  it("menampilkan error saat respons metrik tidak lengkap, bukan nol palsu", async () => {
    const incomplete = { ...D1 } as Record<string, unknown>;
    delete incomplete.total_revenue;
    dashboardMock.mockResolvedValue(incomplete);
    render(<DashboardPage />);

    expect(await screen.findByText(/Data metrik dashboard dari server tidak lengkap/)).toBeInTheDocument();
    expect(screen.queryByText("Rp0")).not.toBeInTheDocument();
  });

  it("menjaga metrik tetap tampil saat daftar pesanan gagal, dengan error pada tabel", async () => {
    listOrdersMock.mockRejectedValue(new Error("network"));
    render(<DashboardPage />);

    await waitFor(() => expect(metric("Pendapatan kotor")).toHaveTextContent("Rp167.400"));
    expect(screen.getAllByText("Gagal memuat pesanan terbaru dari server.").length).toBeGreaterThan(0);
  });

  it("tidak meminta data admin sama sekali untuk penjual", async () => {
    bootstrapAuthMock.mockResolvedValue({ id: "seller-1", role: "seller" });
    render(<DashboardPage />);

    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
    expect(screen.getByText(/hanya untuk admin/)).toBeInTheDocument();
    expect(dashboardMock).not.toHaveBeenCalled();
    expect(dashboardAnalyticsMock).not.toHaveBeenCalled();
    expect(listOrdersMock).not.toHaveBeenCalled();
  });

  it("menampilkan chart summary dari data analitik dan mengganti periode 7/30/90 hari", async () => {
    render(<DashboardPage />);

    expect(await screen.findByText("Tren pendapatan harian")).toBeInTheDocument();
    expect(screen.getByText("Pesanan per hari")).toBeInTheDocument();
    expect(screen.getByText("Komposisi status pesanan")).toBeInTheDocument();
    expect(screen.getByText("Pendapatan per kategori")).toBeInTheDocument();
    expect(screen.getByText("Produk terlaris")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Streaming Video/ })).toBeInTheDocument();
    expect(screen.getAllByText("Netflix Premium").length).toBeGreaterThan(0);

    await waitFor(() => expect(dashboardAnalyticsMock).toHaveBeenCalledWith({ days: 7 }));
    fireEvent.click(screen.getByRole("button", { name: "30 hari" }));
    await waitFor(() => expect(dashboardAnalyticsMock).toHaveBeenLastCalledWith({ days: 30 }));
    expect(screen.getByRole("button", { name: "30 hari" })).toHaveAttribute("aria-pressed", "true");
  });

  it("menampilkan empty state per chart tanpa mengarang angka nol", async () => {
    dashboardAnalyticsMock.mockResolvedValue({
      ...ANALYTICS,
      revenue_series: [],
      orders_series: [],
      status_breakdown: [],
      top_products: [],
      category_breakdown: [],
    });
    render(<DashboardPage />);

    expect(await screen.findByText("Belum ada data pendapatan pada periode ini.")).toBeInTheDocument();
    expect(screen.getByText("Belum ada data pesanan pada periode ini.")).toBeInTheDocument();
    expect(screen.getByText("Belum ada data status pesanan pada periode ini.")).toBeInTheDocument();
    expect(screen.getByText("Belum ada data pendapatan per kategori pada periode ini.")).toBeInTheDocument();
    expect(screen.getByText("Belum ada produk terjual pada periode ini.")).toBeInTheDocument();
  });

  it("menampilkan error analitik yang jelas dan tombol coba lagi", async () => {
    dashboardAnalyticsMock.mockRejectedValue(new Error("network"));
    render(<DashboardPage />);

    expect(await screen.findByText("Gagal memuat analitik dashboard dari server.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
    expect(screen.queryByText("Tren pendapatan harian")).not.toBeInTheDocument();
    expect(screen.queryByText("Rp0")).not.toBeInTheDocument();
  });

  it("menolak respons analitik yang tidak lengkap alih-alih merender nol", async () => {
    const incomplete = { ...ANALYTICS } as Record<string, unknown>;
    delete incomplete.status_breakdown;
    dashboardAnalyticsMock.mockResolvedValue(incomplete);
    render(<DashboardPage />);

    expect(await screen.findByText(/Data analitik dashboard dari server tidak lengkap/)).toBeInTheDocument();
    expect(screen.queryByText("Komposisi status pesanan")).not.toBeInTheDocument();
  });
});
