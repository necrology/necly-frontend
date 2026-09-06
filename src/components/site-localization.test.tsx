import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("site localization", () => {
  it("uses Indonesian navigation and accessible labels", () => {
    render(<SiteHeader />);
    expect(screen.getAllByText("Jelajahi")).toHaveLength(2);
    expect(screen.getAllByText("Cara kerja")).toHaveLength(2);
    expect(screen.getAllByText("Tentang")).toHaveLength(2);
    expect(screen.getByLabelText("Cari produk")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Masuk" })).toHaveLength(2);
  });

  it("links the footer to real subscription categories", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Produk streaming" })).toHaveAttribute("href", "/products?category=Streaming");
    expect(screen.getByRole("link", { name: "Produk produktivitas" })).toHaveAttribute("href", "/products?category=Produktivitas");
    expect(screen.getByText(/Solusi hemat berlangganan akun premium/)).toBeInTheDocument();
    expect(screen.queryByText("Career services")).not.toBeInTheDocument();
  });
});
