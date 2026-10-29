import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSearchResponse } from "@/lib/dashboard-search";

const { searchDashboardMock } = vi.hoisted(() => ({ searchDashboardMock: vi.fn() }));

vi.mock("@/lib/dashboard-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dashboard-search")>();
  return { ...actual, searchDashboard: searchDashboardMock };
});

import DashboardSearchPage from "./page";

const response: DashboardSearchResponse = {
  query: "nabila",
  total: 2,
  groups: [
    {
      kind: "order",
      label: "Pesanan",
      results: [{
        id: "order:o-1",
        kind: "order",
        title: "NCL-260906-091",
        subtitle: "Nabila Rahma",
        meta: "Rp109.000",
        href: "/dashboard/orders/o-1",
      }],
    },
    {
      kind: "customer",
      label: "Pelanggan",
      results: [{
        id: "customer:u-1",
        kind: "customer",
        title: "Nabila Rahma",
        subtitle: "nabila@example.id",
        href: "/dashboard/customers?search=nabila%40example.id",
      }],
    },
  ],
};

describe("halaman hasil pencarian dashboard", () => {
  beforeEach(() => {
    searchDashboardMock.mockReset();
    window.history.pushState({}, "", "/dashboard/search?q=nabila");
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("membaca kata kunci dari URL dan menampilkan hasil per kelompok", async () => {
    searchDashboardMock.mockResolvedValue(response);

    render(<DashboardSearchPage />);

    await waitFor(() => expect(searchDashboardMock).toHaveBeenCalledWith("nabila"));
    expect(await screen.findByText(/2 hasil untuk/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Pesanan/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NCL-260906-091/ })).toHaveAttribute("href", "/dashboard/orders/o-1");
    expect(screen.getByRole("link", { name: /Buka halaman pelanggan/ })).toHaveAttribute(
      "href",
      "/dashboard/customers?search=nabila",
    );
  });

  it("menampilkan keadaan kosong yang jelas", async () => {
    searchDashboardMock.mockResolvedValue({ query: "nabila", total: 0, groups: [] });

    render(<DashboardSearchPage />);

    expect(await screen.findByText("Tidak ada data yang cocok")).toBeInTheDocument();
  });

  it("menampilkan error tanpa mengosongkan halaman", async () => {
    searchDashboardMock.mockRejectedValue(new Error("down"));

    render(<DashboardSearchPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Pencarian gagal dimuat");
  });
});
