import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listCategoriesMock,
  createCategoryMock,
  updateCategoryMock,
  deleteCategoryMock,
  bootstrapAuthMock,
} = vi.hoisted(() => ({
  listCategoriesMock: vi.fn(),
  createCategoryMock: vi.fn(),
  updateCategoryMock: vi.fn(),
  deleteCategoryMock: vi.fn(),
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
      listCategories: listCategoriesMock,
      createCategory: createCategoryMock,
      updateCategory: updateCategoryMock,
      deleteCategory: deleteCategoryMock,
    },
  };
});

import { ApiError } from "@/lib/api";
import CategoriesPage from "./page";

const CATEGORIES = [
  { id: "cat-video", name: "Streaming Video", slug: "streaming-video", description: "Layanan film dan serial", active: true },
  { id: "cat-music", name: "Streaming Musik", slug: "streaming-musik", description: "Layanan musik", active: false },
];

describe("master kategori (NEC-131)", () => {
  beforeEach(() => {
    bootstrapAuthMock.mockReset().mockResolvedValue({ id: "admin-1", role: "admin" });
    listCategoriesMock.mockReset().mockResolvedValue({ categories: CATEGORIES, page: 1, per_page: 100, total: 2 });
    createCategoryMock.mockReset().mockResolvedValue({ id: "cat-new", name: "Streaming Video", slug: "streaming-video" });
    updateCategoryMock.mockReset().mockResolvedValue({ id: "cat-video", name: "Streaming Video", slug: "streaming-video" });
    deleteCategoryMock.mockReset().mockResolvedValue(undefined);
  });

  it("menampilkan daftar kategori beserta slug, deskripsi, dan status", async () => {
    render(<CategoriesPage />);

    expect(await screen.findByText("Streaming Video")).toBeInTheDocument();
    expect(screen.getByText("streaming-video")).toBeInTheDocument();
    expect(screen.getByText("Layanan film dan serial")).toBeInTheDocument();
    expect(screen.getAllByText("Aktif").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nonaktif").length).toBeGreaterThan(0);
    expect(screen.getByText("2 kategori")).toBeInTheDocument();
  });

  it("membuat kategori dengan slug otomatis dari nama", async () => {
    render(<CategoriesPage />);
    await screen.findByText("Streaming Video");

    fireEvent.click(screen.getByRole("button", { name: "Tambah kategori" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nama kategori"), { target: { value: "Streaming Video Premium" } });
    expect(within(dialog).getByLabelText("Slug")).toHaveValue("streaming-video-premium");
    fireEvent.change(within(dialog).getByLabelText("Deskripsi"), { target: { value: "Paket premium" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan kategori" }));

    await waitFor(() =>
      expect(createCategoryMock).toHaveBeenCalledWith({
        name: "Streaming Video Premium",
        slug: "streaming-video-premium",
        description: "Paket premium",
      }),
    );
    await waitFor(() => expect(listCategoriesMock).toHaveBeenCalledTimes(2));
  });

  it("mengedit kategori dan mengirim status aktif yang dipilih", async () => {
    render(<CategoriesPage />);
    await screen.findByText("Streaming Video");

    fireEvent.click(screen.getByRole("button", { name: "Edit Streaming Video" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Nama kategori")).toHaveValue("Streaming Video");
    expect(within(dialog).getByLabelText("Slug")).toHaveValue("streaming-video");

    fireEvent.change(within(dialog).getByLabelText("Nama kategori"), { target: { value: "Streaming Video 4K" } });
    fireEvent.change(within(dialog).getByLabelText("Deskripsi"), { target: { value: "Film kualitas 4K" } });
    fireEvent.click(within(dialog).getByLabelText("Kategori aktif"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan kategori" }));

    await waitFor(() =>
      expect(updateCategoryMock).toHaveBeenCalledWith("cat-video", {
        name: "Streaming Video 4K",
        slug: "streaming-video",
        description: "Film kualitas 4K",
        active: false,
      }),
    );
    await waitFor(() => expect(listCategoriesMock).toHaveBeenCalledTimes(2));
  });

  it("menampilkan error 409 saat slug duplikat dan tidak menutup form", async () => {
    createCategoryMock.mockRejectedValue(new ApiError("Slug kategori sudah digunakan", 409, { code: "conflict" }));
    render(<CategoriesPage />);
    await screen.findByText("Streaming Video");

    fireEvent.click(screen.getByRole("button", { name: "Tambah kategori" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nama kategori"), { target: { value: "Streaming Video" } });
    fireEvent.change(within(dialog).getByLabelText("Slug"), { target: { value: "streaming-video" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan kategori" }));

    expect(await screen.findByText("Slug kategori sudah digunakan. Pilih slug lain.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(createCategoryMock).toHaveBeenCalledTimes(1);
  });

  it("menghapus kategori setelah konfirmasi dan memuat ulang daftar", async () => {
    render(<CategoriesPage />);
    await screen.findByText("Streaming Video");

    fireEvent.click(screen.getByRole("button", { name: "Hapus Streaming Video" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/masih dipakai produk/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Hapus kategori" }));

    await waitFor(() => expect(deleteCategoryMock).toHaveBeenCalledWith("cat-video"));
    await waitFor(() => expect(listCategoriesMock).toHaveBeenCalledTimes(2));
  });

  it("menampilkan pesan server saat kategori gagal dihapus karena masih dipakai", async () => {
    deleteCategoryMock.mockRejectedValue(new ApiError("Kategori masih dipakai produk", 500, { code: "internal_error" }));
    render(<CategoriesPage />);
    await screen.findByText("Streaming Video");

    fireEvent.click(screen.getByRole("button", { name: "Hapus Streaming Video" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Hapus kategori" }));

    expect(await screen.findByText("Kategori gagal dihapus: Kategori masih dipakai produk")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("menampilkan empty state dan error pemuatan yang jelas", async () => {
    listCategoriesMock.mockResolvedValueOnce({ categories: [], page: 1, per_page: 100, total: 0 });
    const { unmount } = render(<CategoriesPage />);
    expect(await screen.findByText(/Belum ada kategori/)).toBeInTheDocument();
    unmount();

    listCategoriesMock.mockRejectedValueOnce(new ApiError("Gagal mengambil daftar kategori", 500, {}));
    render(<CategoriesPage />);
    expect(await screen.findByText("Tidak dapat memuat kategori")).toBeInTheDocument();
    expect(screen.getByText("Gagal mengambil daftar kategori")).toBeInTheDocument();
  });
});
