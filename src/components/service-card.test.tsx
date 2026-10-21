import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { services } from "@/data/seed";
import { ServiceCard } from "./service-card";

describe("ServiceCard", () => {
  it("uses Indonesian accessible and price labels", () => {
    const product = services[0];
    render(<ServiceCard product={product} />);
    expect(screen.getByLabelText(`Lihat ${product.name}`)).toBeInTheDocument();
    expect(screen.getByText("Lihat Skema Harga")).toBeInTheDocument();
    expect(screen.getByText("Pesan")).toBeInTheDocument();
    expect(screen.queryByText("Starting at")).not.toBeInTheDocument();
    expect(screen.queryByText("See pricing")).not.toBeInTheDocument();
  });

  it("tidak merender tautan aktif untuk produk Coming Soon", () => {
    const product = { ...services[0], comingSoon: true, stock: 0, imageUrl: "https://cdn.necly.id/foto.jpg" };

    render(<ServiceCard product={product} />);

    expect(screen.getAllByText("Coming Soon").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: `Lihat ${product.name}` })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pesan" })).not.toBeInTheDocument();
    expect(screen.getByText("Pesan")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText("Preorder")).not.toBeInTheDocument();
  });

  it("memakai ilustrasi bawaan saat foto produk gagal dimuat", () => {
    const product = { ...services[0], imageUrl: "https://cdn.necly.id/foto-rusak.jpg" };

    render(<ServiceCard product={product} />);

    const photo = screen.getByAltText(`Foto produk ${product.name}`);
    expect(photo).toHaveAttribute("data-photo-kind", "product");
    fireEvent.error(photo);
    expect(photo).toHaveAttribute("src", "/illustrations/product-streaming.svg");
    expect(photo).toHaveAttribute("data-photo-kind", "fallback");
  });

  it("tidak menampilkan rating atau jumlah ulasan lama", () => {
    const product = { ...services[0], rating: 4.9, reviews: 184 };

    render(<ServiceCard product={product} />);

    expect(screen.queryByText("4.9 (184)")).not.toBeInTheDocument();
    expect(document.querySelector(".rating")).not.toBeInTheDocument();
  });
});
