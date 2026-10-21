import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, addItemMock } = vi.hoisted(() => ({ pushMock: vi.fn(), addItemMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/stores/cart-store", () => ({ useCartStore: (selector: (state: unknown) => unknown) => selector({ addItem: addItemMock }) }));

import { ProductDetailClient } from "./product-detail-client";
import { products } from "@/data/products";

const comingSoonProduct = { ...products[0], comingSoon: true };

describe("halaman detail produk Coming Soon", () => {
  beforeEach(() => {
    pushMock.mockReset();
    addItemMock.mockReset();
  });

  it("menonaktifkan pemilihan paket, durasi, perangkat, dan tombol pesan", () => {
    render(<ProductDetailClient product={comingSoonProduct} />);

    expect(screen.getByRole("status")).toHaveTextContent(/Produk ini segera hadir/);
    expect(screen.getByRole("button", { name: new RegExp(comingSoonProduct.packageName) })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /1 Bulan/ })[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: "1 Perangkat" })).toBeDisabled();

    const orderButtons = screen.getAllByRole("button", { name: "Pesan" });
    expect(orderButtons.length).toBeGreaterThan(0);
    orderButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it("tidak pernah mendorong produk Coming Soon ke keranjang", () => {
    render(<ProductDetailClient product={comingSoonProduct} />);

    const orderButtons = screen.getAllByRole("button", { name: "Pesan" });
    orderButtons.forEach((button) => fireEvent.click(button));

    expect(addItemMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
