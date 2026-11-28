import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { products } from "@/data/products";
import { CommerceProductCard } from "./commerce-product-card";

const { addItemMock, toastMock, pushMock } = vi.hoisted(() => ({ addItemMock: vi.fn(), toastMock: vi.fn(), pushMock: vi.fn() }));

vi.mock("@/stores/cart-store", () => ({
  useCartStore: (selector: (state: { addItem: typeof addItemMock }) => unknown) => selector({ addItem: addItemMock }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const product = products[0];

describe("CommerceProductCard Coming Soon", () => {
  beforeEach(() => {
    addItemMock.mockReset();
    toastMock.mockReset();
    pushMock.mockReset();
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

  it("menampilkan tombol Pesan yang menambah ke keranjang lalu langsung ke checkout tanpa toast", () => {
    render(<CommerceProductCard product={product} />);

    expect(screen.getByRole("link", { name: /Lihat Skema Harga/ })).toHaveAttribute("href", `/products/${product.slug}`);
    // Tombol Pesan sekarang bukan link lagi, tapi button yang push ke /checkout
    expect(screen.getByRole("button", { name: "Pesan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pesan" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pesan" }));

    expect(addItemMock).toHaveBeenCalledWith(expect.objectContaining({
      id: product.id,
      product_price_id: product.priceOptions[0].id,
      selectedDuration: product.priceOptions[0].duration,
    }));
    expect(pushMock).toHaveBeenCalledWith("/checkout");
    // Toast keranjang TIDAK dipanggil untuk tombol Pesan
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("men-disable tombol Pesan dan ikon keranjang ketika semua stok produk habis", () => {
    render(<CommerceProductCard product={{
      ...product,
      stock: 0,
      priceOptions: product.priceOptions.map((option) => ({ ...option, stock: 0 })),
    }} />);

    const orderButton = screen.getByRole("button", { name: "Pesan" });
    expect(orderButton).toBeDisabled();
    const cartButton = screen.getByRole("button", { name: `Tambah ${product.name} ke keranjang` });
    expect(cartButton).toBeDisabled();
    fireEvent.click(orderButton);
    fireEvent.click(cartButton);
    expect(addItemMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("ikon keranjang tetap menambahkan ke keranjang dan memunculkan toast", () => {
    render(<CommerceProductCard product={product} />);

    fireEvent.click(screen.getByRole("button", { name: `Tambah ${product.name} ke keranjang` }));

    expect(addItemMock).toHaveBeenCalledWith(expect.objectContaining({
      id: product.id,
      product_price_id: product.priceOptions[0].id,
      selectedDuration: product.priceOptions[0].duration,
    }));
    expect(screen.getByRole("status")).toHaveTextContent(`${product.name} ditambahkan ke keranjang.`);
    expect(toastMock).toHaveBeenCalledWith(`${product.name} ditambahkan ke keranjang.`, "success", { duration: 5000, showClose: false });
    expect(pushMock).not.toHaveBeenCalled();
  });
});