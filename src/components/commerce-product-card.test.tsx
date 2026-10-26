import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { CommerceProductCard } from "./commerce-product-card";

const product = products[0];

describe("CommerceProductCard Coming Soon", () => {
  it("menampilkan badge Coming Soon tanpa tautan aktif", () => {
    render(<CommerceProductCard product={{ ...product, comingSoon: true }} />);

    expect(screen.getAllByText("Coming Soon").length).toBeGreaterThan(0);
    expect(screen.getByTestId("coming-soon-ribbon")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Lihat Skema Harga/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pesan" })).not.toBeInTheDocument();
    expect(screen.getByText("Pesan")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText("Stok Terbatas")).not.toBeInTheDocument();
  });

  it("tetap menautkan kartu produk aktif", () => {
    render(<CommerceProductCard product={product} />);

    expect(screen.getByRole("link", { name: /Lihat Skema Harga/ })).toHaveAttribute("href", `/products/${product.slug}`);
    expect(screen.getByRole("link", { name: "Pesan" })).toHaveAttribute("href", `/products/${product.slug}`);
  });
});
