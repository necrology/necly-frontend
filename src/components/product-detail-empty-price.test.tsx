import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/cart-store", () => ({ useCartStore: (selector: (state: unknown) => unknown) => selector({ addItem: vi.fn() }) }));

import { ProductDetailClient } from "./product-detail-client";
import { products } from "@/data/products";

// Produk yang baru dibuat lewat dashboard belum punya baris harga. Halaman
// detail tidak boleh crash; tampilkan status belum tersedia tanpa CTA pesan.
const productWithoutPrice = { ...products[0], price: 0, priceOptions: [] };

describe("halaman detail produk tanpa harga", () => {
  it("menampilkan status belum tersedia tanpa crash dan tanpa tombol pesan", () => {
    render(<ProductDetailClient product={productWithoutPrice} />);

    expect(screen.getByRole("heading", { name: productWithoutPrice.name })).toBeInTheDocument();
    expect(screen.getByText(/Paket harga untuk produk ini belum tersedia/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pesan/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat produk lain" })).toHaveAttribute("href", "/products");
  });
});
