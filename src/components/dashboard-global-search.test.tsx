import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSearchResponse } from "@/lib/dashboard-search";

const { pushMock, searchDashboardMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchDashboardMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/dashboard-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dashboard-search")>();
  return { ...actual, searchDashboard: searchDashboardMock };
});

import { DashboardGlobalSearch } from "./dashboard-global-search";

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
        subtitle: "Nabila Rahma · nabila@example.id",
        meta: "StreamFlix Keluarga · Rp109.000",
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
        meta: "Pelanggan",
        href: "/dashboard/customers?search=nabila%40example.id",
      }],
    },
  ],
};

function searchInput() {
  return screen.getByRole("combobox", { name: "Cari di dashboard" });
}

describe("pencarian global di topbar dashboard", () => {
  beforeEach(() => {
    pushMock.mockReset();
    searchDashboardMock.mockReset();
    searchDashboardMock.mockResolvedValue(response);
  });

  it("meminta kata kunci minimal dua karakter sebelum mencari", () => {
    render(<DashboardGlobalSearch />);

    fireEvent.change(searchInput(), { target: { value: "n" } });

    expect(screen.getByText(/Ketik minimal 2 karakter/)).toBeInTheDocument();
    expect(searchDashboardMock).not.toHaveBeenCalled();
  });

  it("menampilkan hasil berkelompok setelah mengetik", async () => {
    render(<DashboardGlobalSearch />);

    fireEvent.change(searchInput(), { target: { value: "nabila" } });

    await waitFor(() => expect(searchDashboardMock).toHaveBeenCalledWith("nabila"));
    await waitFor(() => expect(screen.getByText("Pesanan")).toBeInTheDocument());

    expect(screen.getByRole("option", { name: /NCL-260906-091/ })).toHaveAttribute("href", "/dashboard/orders/o-1");
    const customerOption = screen.getAllByRole("option")
      .find((option) => option.getAttribute("href") === "/dashboard/customers?search=nabila%40example.id");
    expect(customerOption).toBeDefined();
  });

  it("membuka halaman hasil lengkap saat Enter ditekan tanpa memilih baris", async () => {
    render(<DashboardGlobalSearch />);

    fireEvent.change(searchInput(), { target: { value: "nabila" } });
    await waitFor(() => expect(searchDashboardMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Pesanan")).toBeInTheDocument());

    fireEvent.keyDown(searchInput(), { key: "Enter" });

    expect(pushMock).toHaveBeenCalledWith("/dashboard/search?q=nabila");
  });

  it("mendukung navigasi panah lalu Enter untuk membuka hasil terpilih", async () => {
    render(<DashboardGlobalSearch />);

    fireEvent.change(searchInput(), { target: { value: "nabila" } });
    await waitFor(() => expect(screen.getByText("Pesanan")).toBeInTheDocument());

    fireEvent.keyDown(searchInput(), { key: "ArrowDown" });
    fireEvent.keyDown(searchInput(), { key: "Enter" });

    expect(pushMock).toHaveBeenCalledWith("/dashboard/orders/o-1");
  });

  it("memfokuskan kolom pencarian lewat pintasan Ctrl+K", () => {
    render(<DashboardGlobalSearch />);

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(searchInput()).toHaveFocus();
  });

  it("menampilkan pesan kosong saat tidak ada hasil", async () => {
    searchDashboardMock.mockResolvedValue({ query: "zzz", total: 0, groups: [] });
    render(<DashboardGlobalSearch />);

    fireEvent.change(searchInput(), { target: { value: "zzz" } });

    await waitFor(() => expect(screen.getByText(/Tidak ada hasil untuk/)).toBeInTheDocument());
  });
});
