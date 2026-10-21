import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listProductsMock } = vi.hoisted(() => ({ listProductsMock: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    catalogApi: { ...actual.catalogApi, listProducts: listProductsMock },
  };
});

import { ProductSearchBar } from "./product-search-bar";

function liveProduct() {
  return {
    id: "0192f0a3-0000-0000-0000-000000000001",
    name: "Netflix Premium",
    slug: "netflix-premium",
    description: "Slot Netflix",
    category: { id: "0192f0a2-0000-0000-0000-000000000001", name: "Streaming Video", slug: "video-streaming" },
    prices: [
      { id: "0192f0a4-0000-0000-0000-000000000001", amount: 186_000, active: true, available_slots: 1, duration: { name: "1 Bulan", days: 30 } },
    ],
  };
}

describe("katalog live", () => {
  beforeEach(() => {
    listProductsMock.mockReset();
    listProductsMock.mockResolvedValue({
      products: [
        liveProduct(),
        {
          ...liveProduct(),
          id: "0192f0a3-0000-0000-0000-000000000004",
          name: "Apple Music Family",
          slug: "apple-music-family",
          category: { id: "0192f0a2-0000-0000-0000-000000000003", name: "Produktivitas Bersama", slug: "productivity-suites" },
        },
      ],
      page: 1,
      per_page: 100,
      total: 2,
    });
  });

  it("menampilkan produk dari API dan menautkan id harga live", async () => {
    render(<ProductSearchBar />);

    expect(await screen.findByText("Netflix Premium")).toBeInTheDocument();
    expect(listProductsMock).toHaveBeenCalledWith({ per_page: 100 });
    expect(screen.getAllByRole("link", { name: "Pesan" })[0]).toHaveAttribute("href", "/products/netflix-premium");
    expect(screen.getByRole("combobox", { name: "Pilih kategori" })).toHaveTextContent("Streaming");
  });

  it("memfilter hasil memakai kategori turunan katalog", async () => {
    render(<ProductSearchBar />);
    await screen.findByText("Netflix Premium");

    fireEvent.change(screen.getByRole("combobox", { name: "Pilih kategori" }), { target: { value: "Produktivitas" } });

    expect(screen.getByText("Apple Music")).toBeInTheDocument();
    expect(screen.queryByText("Netflix Premium")).not.toBeInTheDocument();
  });

  it("tidak memakai data contoh ketika API gagal", async () => {
    listProductsMock.mockRejectedValue(new Error("Network error"));
    render(<ProductSearchBar />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Produk belum dapat dimuat/);
    // Produk dari data contoh tidak boleh muncul sebagai fallback diam-diam.
    expect(screen.queryByText("Apple One")).not.toBeInTheDocument();
  });
});
