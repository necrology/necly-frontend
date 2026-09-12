import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("site localization", () => {
  it("uses Indonesian navigation and accessible labels", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Beranda" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Layanan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cara Berlangganan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Laporan Kendala" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buka navigasi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cari layanan" })).toBeInTheDocument();
    // The drawer stays out of the accessibility tree until it is opened.
    expect(screen.getByRole("link", { name: "Log In" })).toBeInTheDocument();
  });

  it("keeps the footer Indonesian and links to real storefront routes", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("navigation", { name: "Navigasi footer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
    expect(screen.getByRole("link", { name: "Laporan Kendala" })).toHaveAttribute("href", "/laporan-kendala");
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "TikTok" })).toBeInTheDocument();
    expect(screen.getByText(/Solusi premium untuk hiburan tanpa batas/)).toBeInTheDocument();
    expect(screen.queryByText("Career services")).not.toBeInTheDocument();
  });
});
