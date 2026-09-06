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

  it("menampilkan ringkasan pesanan dan voucher dalam bahasa Indonesia alami", () => {
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
      };
      return selector(state);
    });

    render(<CartClient />);

    expect(screen.getByText("Ringkasan pesanan")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Diskon")).toBeInTheDocument();
    expect(screen.getByText("Biaya layanan (2.5%)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gunakan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lanjutkan ke checkout" })).toHaveAttribute("href", "/checkout");
    expect(screen.queryByText(/Continue to checkout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Apply/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fixed-scope professional service/i)).not.toBeInTheDocument();
  });
});
