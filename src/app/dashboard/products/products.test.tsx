import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listProductsMock, listCategoriesMock, updateProductMock, createProductMock, bootstrapAuthMock, compressProductImageMock } = vi.hoisted(() => ({
  listProductsMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  updateProductMock: vi.fn(),
  createProductMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
  compressProductImageMock: vi.fn(),
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

vi.mock("@/lib/product-image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/product-image")>();
  return { ...actual, compressProductImage: compressProductImageMock };
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
  coming_soon: false,
  prices: [{ id: "price-1", amount: 79000, active: true, duration_name: "1 Bulan", duration_days: 30 }],
};

const CATEGORIES = [
  { id: "cat-video", name: "Streaming Video", slug: "streaming-video" },
  { id: "cat-music", name: "Streaming Musik", slug: "streaming-musik" },
  { id: "cat-cloud", name: "Penyimpanan Awan", slug: "penyimpanan-awan" },
];

const COMPRESSED_PHOTO = "data:image/jpeg;base64,Zm90bw==";

describe("produk admin (W18)", () => {
  beforeEach(() => {
    listProductsMock.mockReset().mockResolvedValue({ products: [PRODUCT], page: 1, per_page: 100, total: 1 });
    listCategoriesMock.mockReset().mockResolvedValue({ categories: CATEGORIES, page: 1, per_page: 100, total: 3 });
    updateProductMock.mockReset().mockResolvedValue(PRODUCT);
    createProductMock.mockReset().mockResolvedValue(PRODUCT);
    bootstrapAuthMock.mockReset().mockResolvedValue({ id: "admin-1", role: "admin" });
    compressProductImageMock.mockReset().mockResolvedValue(COMPRESSED_PHOTO);
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
      active: true,
      coming_soon: false,
    });
    // Foto tidak diganti: image_url tidak boleh dikirim agar tidak menimpa foto lama.
    expect(updateProductMock.mock.calls[0]?.[1]).not.toHaveProperty("image_url");
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

  it("mengirim payload status yang konsisten dari aksi cepat baris", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Family");

    fireEvent.change(screen.getByLabelText("Ubah status Spotify Family"), { target: { value: "Coming Soon" } });

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock).toHaveBeenCalledWith("prd-music", { active: true, coming_soon: true });

    fireEvent.change(screen.getByLabelText("Ubah status Spotify Family"), { target: { value: "Nonaktif" } });

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(2));
    expect(updateProductMock).toHaveBeenLastCalledWith("prd-music", { active: false, coming_soon: false });
  });

  it("menyaring tabel berdasarkan status Coming Soon", async () => {
    listProductsMock.mockResolvedValue({
      products: [PRODUCT, { ...PRODUCT, id: "prd-canva", name: "Canva Teams", coming_soon: true }],
      page: 1,
      per_page: 100,
      total: 2,
    });

    render(<ProductsPage />);
    expect(await screen.findByText("Canva Teams")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter status"), { target: { value: "Coming Soon" } });

    expect(screen.getByText("Canva Teams")).toBeInTheDocument();
    expect(screen.queryByText("Spotify Family")).not.toBeInTheDocument();
  });

  it("mengompres foto yang dipilih dan mengirim data URL saat menyimpan", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Family");

    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Family" }));
    const file = new File(["foto"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Pilih foto produk"), { target: { files: [file] } });

    await waitFor(() => expect(compressProductImageMock).toHaveBeenCalledWith(file));
    await waitFor(() => expect(screen.getByAltText("Pratinjau foto Spotify Family")).toHaveAttribute("src", COMPRESSED_PHOTO));

    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock.mock.calls[0]?.[1]).toMatchObject({
      image_url: COMPRESSED_PHOTO,
      active: true,
      coming_soon: false,
    });
  });

  it("mengirim image_url kosong saat foto dihapus", async () => {
    listProductsMock.mockResolvedValue({
      products: [{ ...PRODUCT, image_url: "https://cdn.necly.id/spotify.jpg" }],
      page: 1,
      per_page: 100,
      total: 1,
    });

    render(<ProductsPage />);
    await screen.findByText("Spotify Family");

    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Family" }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus foto" }));
    expect(screen.getByText("Foto akan dihapus saat produk disimpan.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock.mock.calls[0]?.[1]).toMatchObject({ image_url: "" });
  });
});
