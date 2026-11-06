import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { products } from "@/data/products";
import { CommerceProductCard } from "./commerce-product-card";

const { addItemMock, toastMock } = vi.hoisted(() => ({ addItemMock: vi.fn(), toastMock: vi.fn() }));

vi.mock("@/stores/cart-store", () => ({
  useCartStore: (selector: (state: { addItem: typeof addItemMock }) => unknown) => selector({ addItem: addItemMock }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));

const product = products[0];

describe("CommerceProductCard Coming Soon", () => {
  beforeEach(() => {
    addItemMock.mockReset();
    toastMock.mockReset();
  });

  it("menampilkan badge Coming Soon tanpa tautan aktif", () => {
    render(<CommerceProductCard product={{ ...product, comingSoon: true }} />);

    expect(screen.getAllByText("Coming Soon").length).toBeGreaterThan(0);
    expect(screen.getByTestId("coming-soon-ribbon")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Lihat Skema Harga/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pesan" })).not.toBeInTheDocument();
    expect(screen.getByText("Pesan")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Tambah ke keranjang (Coming Soon)" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Tambah ke keranjang (Coming Soon)" }));
    expect(addItemMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Stok Terbatas")).not.toBeInTheDocument();
  });

  it("tetap menautkan kartu produk aktif dan menambahkan ke keranjang tanpa memerlukan sesi login", () => {
    render(<CommerceProductCard product={product} />);

    expect(screen.getByRole("link", { name: /Lihat Skema Harga/ })).toHaveAttribute("href", `/products/${product.slug}`);
    expect(screen.getByRole("link", { name: "Pesan" })).toHaveAttribute("href", `/products/${product.slug}`);

    fireEvent.click(screen.getByRole("button", { name: `Tambah ${product.name} ke keranjang` }));

    expect(addItemMock).toHaveBeenCalledWith(expect.objectContaining({
      id: product.id,
      product_price_id: product.priceOptions[0].id,
      selectedDuration: product.priceOptions[0].duration,
    }));
    expect(screen.getByRole("status")).toHaveTextContent(`${product.name} ditambahkan ke keranjang.`);
    expect(toastMock).toHaveBeenCalledWith(`${product.name} ditambahkan ke keranjang.`, "success");
  });

  it("men-disable ikon keranjang ketika semua stok produk habis", () => {
    render(<CommerceProductCard product={{
      ...product,
      stock: 0,
      priceOptions: product.priceOptions.map((option) => ({ ...option, stock: 0 })),
    }} />);

    const button = screen.getByRole("button", { name: `Tambah ${product.name} ke keranjang` });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(addItemMock).not.toHaveBeenCalled();
  });
});
