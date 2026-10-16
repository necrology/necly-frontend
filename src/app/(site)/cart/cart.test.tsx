import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartClient } from "./cart-client";
import CartPage, { metadata as cartMetadata } from "./page";

const mockUseCartStore = vi.fn();

vi.mock("@/stores/cart-store", () => ({
  useCartStore: (selector: (state: unknown) => unknown) => mockUseCartStore(selector),
}));

describe("Halaman dan Client Keranjang", () => {
  beforeEach(() => {
    mockUseCartStore.mockReset();
  });

  it("memiliki metadata berbahasa Indonesia", () => {
    expect(cartMetadata.title).toBe("Keranjang belanja");
    expect(cartMetadata.description).toContain("Periksa pilihan slot langganan Anda");
  });

  it("menampilkan teks keranjang kosong dalam bahasa Indonesia", () => {
    mockUseCartStore.mockImplementation((selector) => {
      const state = {
        items: [],
        setQuantity: vi.fn(),
        removeItem: vi.fn(),
      };
      return selector(state);
    });

    render(<CartClient />);

    expect(screen.getByText("Keranjang belanja Anda masih kosong.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jelajahi produk" })).toHaveAttribute("href", "/products");
    expect(screen.queryByText(/Your cart/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Browse services/i)).not.toBeInTheDocument();
  });

  it("menampilkan ringkasan pesanan dalam bahasa Indonesia alami", () => {
    mockUseCartStore.mockImplementation((selector) => {
      const state = {
        items: [
          {
            id: "prd-1",
            slug: "netflix-premium",
            name: "Netflix Premium",
            category: "Streaming",
            price: 186000,
            quantity: 1,
            stock: 5,
          },
        ],
        setQuantity: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      return selector(state);
    });

    render(<CartClient />);

    expect(screen.getByText("Ringkasan pesanan")).toBeInTheDocument();
    expect(screen.getByText("Subtotal (1 item)")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    // Backend hanya menagih subtotal dikurangi diskon voucher, jadi biaya
    // layanan tidak boleh muncul di sini.
    expect(screen.queryByText(/Biaya layanan/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lanjutkan ke checkout" })).toHaveAttribute("href", "/checkout");
    expect(screen.queryByText(/Continue to checkout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fixed-scope professional service/i)).not.toBeInTheDocument();
  });

  // Store mencocokkan baris lewat product_price_id ?? id. Halaman ini dulu
  // mengirim item.id, sehingga pada produk dari katalog tombol hapus dan
  // pengubah jumlah tidak berpengaruh sama sekali.
  it("menghapus dan mengubah jumlah memakai kunci baris yang sama dengan store", () => {
    const removeItem = vi.fn();
    const setQuantity = vi.fn();
    mockUseCartStore.mockImplementation((selector) => selector({
      items: [{ id: "prd-1", slug: "netflix-premium", name: "Netflix Premium", category: "Streaming", price: 186000, quantity: 2, stock: 5, product_price_id: "harga-uuid" }],
      setQuantity,
      removeItem,
      clear: vi.fn(),
    }));

    render(<CartClient />);

    fireEvent.click(screen.getByRole("button", { name: "Hapus Netflix Premium" }));
    expect(removeItem).toHaveBeenCalledWith("harga-uuid");

    fireEvent.click(screen.getByRole("button", { name: "Tambah jumlah Netflix Premium" }));
    expect(setQuantity).toHaveBeenCalledWith("harga-uuid", 3);
  });
});
