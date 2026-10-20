import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listProductsMock, listCategoriesMock, updateProductMock, createProductMock, bootstrapAuthMock } = vi.hoisted(() => ({
  listProductsMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  updateProductMock: vi.fn(),
  createProductMock: vi.fn(),
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
      listProducts: listProductsMock,
      listCategories: listCategoriesMock,
      updateProduct: updateProductMock,
      createProduct: createProductMock,
    },
  };
});

import ProductsPage from "./page";

const PRODUCT = {
  id: "prd-music",
  name: "Spotify Family",
  slug: "spotify-family",
  description: "Musik keluarga",
  category_id: "cat-music",
  category: { id: "cat-music", name: "Streaming Musik", slug: "streaming-musik" },
  active: true,
  prices: [{ id: "price-1", amount: 79000, active: true, duration_name: "1 Bulan", duration_days: 30 }],
};

const CATEGORIES = [
  { id: "cat-video", name: "Streaming Video", slug: "streaming-video" },
  { id: "cat-music", name: "Streaming Musik", slug: "streaming-musik" },
  { id: "cat-cloud", name: "Penyimpanan Awan", slug: "penyimpanan-awan" },
];

describe("produk admin (W18)", () => {
  beforeEach(() => {
    listProductsMock.mockReset().mockResolvedValue({ products: [PRODUCT], page: 1, per_page: 100, total: 1 });
    listCategoriesMock.mockReset().mockResolvedValue({ categories: CATEGORIES, page: 1, per_page: 100, total: 3 });
    updateProductMock.mockReset().mockResolvedValue(PRODUCT);
    createProductMock.mockReset().mockResolvedValue(PRODUCT);
    bootstrapAuthMock.mockReset().mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("mempertahankan category_id asli saat edit tanpa memilih kategori lagi", async () => {
    render(<ProductsPage />);

    expect(await screen.findByText("Spotify Family")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Family" }));

    const category = screen.getByLabelText("Kategori") as HTMLSelectElement;
    expect(category.value).toBe("cat-music");

    fireEvent.change(screen.getByLabelText("Nama produk"), { target: { value: "Spotify Family Baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock.mock.calls[0]?.[1]).toMatchObject({
      name: "Spotify Family Baru",
      category_id: "cat-music",
    });
  });

  it("menolak mengosongkan deskripsi saat edit karena backend mempertahankan nilai lama", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Family");

    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Family" }));
    fireEvent.change(screen.getByLabelText("Deskripsi"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    expect(await screen.findByText(/Deskripsi tidak dapat dikosongkan saat edit/)).toBeInTheDocument();
    expect(updateProductMock).not.toHaveBeenCalled();
  });

  it("mewajibkan kategori dipilih untuk produk baru alih-alih memilih kategori pertama diam-diam", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Family");

    fireEvent.click(screen.getByRole("button", { name: "Tambah produk" }));
    fireEvent.change(screen.getByLabelText("Nama produk"), { target: { value: "Produk Baru" } });

    const category = screen.getByLabelText("Kategori") as HTMLSelectElement;
    expect(category.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));
    expect(await screen.findByText("Pilih kategori produk terlebih dahulu.")).toBeInTheDocument();
    expect(createProductMock).not.toHaveBeenCalled();
  });
});
