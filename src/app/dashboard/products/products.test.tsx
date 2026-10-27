import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSearchableOption, searchableSelectedText } from "@/test/searchable-select";

const {
  listProductsMock,
  listCategoriesMock,
  listProductDurationsMock,
  listProductPricesMock,
  createProductPriceMock,
  updateProductPriceMock,
  deleteProductPriceMock,
  updateProductMock,
  createProductMock,
  bootstrapAuthMock,
  compressProductImageMock,
  compressProductIconMock,
} = vi.hoisted(() => ({
  listProductsMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  listProductDurationsMock: vi.fn(),
  listProductPricesMock: vi.fn(),
  createProductPriceMock: vi.fn(),
  updateProductPriceMock: vi.fn(),
  deleteProductPriceMock: vi.fn(),
  updateProductMock: vi.fn(),
  createProductMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
  compressProductImageMock: vi.fn(),
  compressProductIconMock: vi.fn(),
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
      listProductDurations: listProductDurationsMock,
      listProductPrices: listProductPricesMock,
      createProductPrice: createProductPriceMock,
      updateProductPrice: updateProductPriceMock,
      deleteProductPrice: deleteProductPriceMock,
      updateProduct: updateProductMock,
      createProduct: createProductMock,
    },
  };
});

vi.mock("@/lib/product-image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/product-image")>();
  return { ...actual, compressProductImage: compressProductImageMock, compressProductIcon: compressProductIconMock };
});

import ProductsPage from "./page";

const PRODUCT = {
  id: "prd-music",
  name: "Spotify Premium",
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
const COMPRESSED_ICON = "data:image/webp;base64,aWNvbg==";

describe("produk admin (W18)", () => {
  beforeEach(() => {
    listProductsMock.mockReset().mockResolvedValue({ products: [PRODUCT], page: 1, per_page: 100, total: 1 });
    listCategoriesMock.mockReset().mockResolvedValue({ categories: CATEGORIES, page: 1, per_page: 100, total: 3 });
    listProductDurationsMock.mockReset().mockResolvedValue({
      durations: [
        { id: "dur-1", name: "1 Bulan", days: 30 },
        { id: "dur-3", name: "3 Bulan", days: 90 },
        { id: "dur-6", name: "6 Bulan", days: 180 },
        { id: "dur-12", name: "12 Bulan", days: 365 },
      ],
    });
    listProductPricesMock.mockReset().mockResolvedValue({
      prices: [{ id: "price-1", amount: 79000, active: true, duration: { id: "dur-1", name: "1 Bulan", days: 30 } }],
    });
    createProductPriceMock.mockReset().mockResolvedValue({ id: "price-new", amount: 55000 });
    updateProductPriceMock.mockReset().mockResolvedValue({ id: "price-1", amount: 79000 });
    deleteProductPriceMock.mockReset().mockResolvedValue(undefined);
    updateProductMock.mockReset().mockResolvedValue(PRODUCT);
    createProductMock.mockReset().mockResolvedValue(PRODUCT);
    bootstrapAuthMock.mockReset().mockResolvedValue({ id: "admin-1", role: "admin" });
    compressProductImageMock.mockReset().mockResolvedValue(COMPRESSED_PHOTO);
    compressProductIconMock.mockReset().mockResolvedValue(COMPRESSED_ICON);
  });

  it("mempertahankan category_id asli saat edit tanpa memilih kategori lagi", async () => {
    render(<ProductsPage />);

    expect(await screen.findByText("Spotify Premium")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Premium" }));

    expect(searchableSelectedText("Kategori")).toBe("Streaming Musik");

    fireEvent.change(screen.getByLabelText("Nama produk"), { target: { value: "Spotify Premium Baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock.mock.calls[0]?.[1]).toMatchObject({
      name: "Spotify Premium Baru",
      category_id: "cat-music",
      active: true,
      coming_soon: false,
    });
    // Foto/icon tidak diganti: field terkait tidak boleh dikirim agar nilai lama tetap.
    expect(updateProductMock.mock.calls[0]?.[1]).not.toHaveProperty("image_url");
    expect(updateProductMock.mock.calls[0]?.[1]).not.toHaveProperty("icon_url");
  });

  it("menolak mengosongkan deskripsi saat edit karena backend mempertahankan nilai lama", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Premium");

    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Premium" }));
    fireEvent.change(screen.getByLabelText("Deskripsi"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    expect(await screen.findByText(/Deskripsi tidak dapat dikosongkan saat edit/)).toBeInTheDocument();
    expect(updateProductMock).not.toHaveBeenCalled();
  });

  it("mewajibkan kategori dipilih untuk produk baru alih-alih memilih kategori pertama diam-diam", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Premium");

    fireEvent.click(screen.getByRole("button", { name: "Tambah produk" }));
    fireEvent.change(screen.getByLabelText("Nama produk"), { target: { value: "Produk Baru" } });

    expect(searchableSelectedText("Kategori")).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));
    expect(await screen.findByText("Pilih kategori produk terlebih dahulu.")).toBeInTheDocument();
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("mengirim payload status yang konsisten dari aksi cepat baris", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Premium");

    chooseSearchableOption("Ubah status Spotify Premium", "Coming Soon");

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock).toHaveBeenCalledWith("prd-music", { active: true, coming_soon: true });

    chooseSearchableOption("Ubah status Spotify Premium", "Nonaktif");

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(2));
    expect(updateProductMock).toHaveBeenLastCalledWith("prd-music", { active: false, coming_soon: false });
  });

  it("menampilkan nama kategori asli dari master, bukan kategori lama hasil pemetaan", async () => {
    render(<ProductsPage />);

    expect(await screen.findByText("Spotify Premium")).toBeInTheDocument();
    expect(screen.getByText("Streaming Musik")).toBeInTheDocument();
    expect(screen.queryByText("Streaming")).not.toBeInTheDocument();
  });

  it("memakai opsi master kategori pada filter produk", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Premium");

    chooseSearchableOption("Filter kategori", "Streaming Musik");

    expect(screen.getByText("Spotify Premium")).toBeInTheDocument();
    expect(screen.getByText("1 hasil")).toBeInTheDocument();

    chooseSearchableOption("Filter kategori", "Penyimpanan Awan");

    expect(screen.getByText("0 hasil")).toBeInTheDocument();
    expect(screen.queryByText("Spotify Premium")).not.toBeInTheDocument();
  });

  it("menautkan ke master kategori saat daftar kategori kosong", async () => {
    listCategoriesMock.mockResolvedValue({ categories: [], page: 1, per_page: 100, total: 0 });
    render(<ProductsPage />);

    expect(await screen.findByText(/Belum ada kategori. Buat master kategori terlebih dahulu/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Kategori|kategori/ }).some((link) => link.getAttribute("href") === "/dashboard/categories")).toBe(true);
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

    chooseSearchableOption("Filter status", "Coming Soon");

    expect(screen.getByText("Canva Teams")).toBeInTheDocument();
    expect(screen.queryByText("Spotify Premium")).not.toBeInTheDocument();
  });

  it("mengompres foto yang dipilih dan mengirim data URL saat menyimpan", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Premium");

    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Premium" }));
    const file = new File(["foto"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Pilih foto produk"), { target: { files: [file] } });

    await waitFor(() => expect(compressProductImageMock).toHaveBeenCalledWith(file));
    await waitFor(() => expect(screen.getByAltText("Pratinjau foto Spotify Premium")).toHaveAttribute("src", COMPRESSED_PHOTO));

    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock.mock.calls[0]?.[1]).toMatchObject({
      image_url: COMPRESSED_PHOTO,
      active: true,
      coming_soon: false,
    });
  });

  it("mengompres icon yang dipilih dan mengirim data URL icon_url", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Premium");

    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Premium" }));
    const file = new File(["icon"], "icon.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Pilih icon produk"), { target: { files: [file] } });

    await waitFor(() => expect(compressProductIconMock).toHaveBeenCalledWith(file));
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByAltText("Icon Spotify Premium")).toHaveAttribute("src", COMPRESSED_ICON));

    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock.mock.calls[0]?.[1]).toMatchObject({ icon_url: COMPRESSED_ICON });
  });

  it("mengirim icon_url kosong saat icon dihapus dan menerima URL manual", async () => {
    listProductsMock.mockResolvedValue({
      products: [{ ...PRODUCT, icon_url: "/design-assets/logo-spotify.png" }],
      page: 1,
      per_page: 100,
      total: 1,
    });

    render(<ProductsPage />);
    await screen.findByText("Spotify Premium");

    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Premium" }));
    expect(within(screen.getByRole("dialog")).getByAltText("Icon Spotify Premium").getAttribute("src")).toContain("/design-assets/logo-spotify.png");
    fireEvent.click(screen.getByRole("button", { name: "Hapus icon" }));
    expect(screen.getByText("Icon akan dihapus saat produk disimpan.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock.mock.calls[0]?.[1]).toMatchObject({ icon_url: "" });
  });

  it("mengirim image_url kosong saat foto dihapus", async () => {
    listProductsMock.mockResolvedValue({
      products: [{ ...PRODUCT, image_url: "https://cdn.necly.id/spotify.jpg" }],
      page: 1,
      per_page: 100,
      total: 1,
    });

    render(<ProductsPage />);
    await screen.findByText("Spotify Premium");

    fireEvent.click(screen.getByRole("button", { name: "Edit Spotify Premium" }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus foto" }));
    expect(screen.getByText("Foto akan dihapus saat produk disimpan.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateProductMock.mock.calls[0]?.[1]).toMatchObject({ image_url: "" });
  });

  it("membuat produk baru beserta harga patungan dalam satu alur", async () => {
    render(<ProductsPage />);
    await screen.findByText("Spotify Premium");

    fireEvent.click(screen.getByRole("button", { name: "Tambah produk" }));
    fireEvent.change(screen.getByLabelText("Nama produk"), { target: { value: "ChatGPT Plus" } });
    chooseSearchableOption("Kategori", "Streaming Musik");
    fireEvent.change(screen.getByLabelText("Harga modal (total)"), { target: { value: "300000" } });
    fireEvent.change(screen.getByLabelText("Biaya admin (total)"), { target: { value: "30000" } });
    fireEvent.click(screen.getByLabelText("Ya, admin mengambil 1 bagian"));
    fireEvent.click(screen.getByRole("button", { name: "Simpan produk" }));

    await waitFor(() => expect(createProductMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(createProductPriceMock).toHaveBeenCalledTimes(1));
    expect(createProductPriceMock.mock.calls[0]?.[0]).toBe("prd-music");
    expect(createProductPriceMock.mock.calls[0]?.[1]).toMatchObject({
      duration_id: "dur-1",
      base_amount: 300000,
      admin_fee: 30000,
      member_slots: 5,
      admin_included: true,
      active: true,
    });
  });
});
