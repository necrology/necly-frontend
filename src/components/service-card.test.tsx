import { render, screen } from "@testing-library/react";
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

  it("tidak menampilkan rating atau jumlah ulasan lama", () => {
    const product = { ...services[0], rating: 4.9, reviews: 184 };

    render(<ServiceCard product={product} />);

    expect(screen.queryByText("4.9 (184)")).not.toBeInTheDocument();
    expect(document.querySelector(".rating")).not.toBeInTheDocument();
  });
});
