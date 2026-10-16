import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/api";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("site localization", () => {
  afterEach(() => {
    useAuthStore.getState().clearAuth();
  });

  // Header dulu selalu menulis "Log In" dan tidak ada tombol keluar di mana pun,
  // jadi sesi hanya berakhir saat cookie kedaluwarsa.
  it("menampilkan menu akun dan tombol keluar setelah pengguna masuk", () => {
    useAuthStore.getState().setAuth(
      { id: "u-1", email: "budi@example.id", name: "Budi Santoso", role: "customer", emailVerifiedAt: null, createdAt: "", updatedAt: "" },
      "token-uji",
    );
    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: "Log In" })).not.toBeInTheDocument();
    const primaryNavigation = screen.getByRole("navigation", { name: "Navigasi utama" });
    const trigger = within(primaryNavigation).getByRole("button", { name: "Budi" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    const menu = within(primaryNavigation).getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /Keluar/ })).toBeInTheDocument();
    // Pelanggan tidak boleh ditawari dashboard yang khusus admin/penjual.
    expect(within(menu).queryByRole("menuitem", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  // Ikon profil dulu menautkan langsung, dan untuk pelanggan tautannya menunjuk
  // /login — setiap klik terlempar kembali ke halaman masuk. Sekarang ikon
  // membuka menu yang memuat profil, keranjang, dan keluar.
  it("ikon profil membuka menu profil, keranjang, dan keluar", () => {
    useAuthStore.getState().setAuth(
      { id: "u-1", email: "budi@example.id", name: "Budi Santoso", role: "customer", emailVerifiedAt: null, createdAt: "", updatedAt: "" },
      "token-uji",
    );
    render(<SiteHeader />);

    const icon = screen.getByRole("button", { name: "Menu akun Budi Santoso" });
    expect(icon).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(icon);

    const menu = screen.getByRole("menu", { name: "Menu akun" });
    expect(within(menu).getByRole("menuitem", { name: /Profil/ })).toHaveAttribute("href", "/akun");
    expect(within(menu).getByRole("menuitem", { name: /Keranjang/ })).toHaveAttribute("href", "/cart");
    expect(within(menu).getByRole("menuitem", { name: /Keluar/ })).toBeInTheDocument();
    // Pelanggan tidak ditawari dashboard yang khusus admin/penjual.
    expect(within(menu).queryByRole("menuitem", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("ikon profil pada pengunjung yang belum masuk menawarkan masuk dan daftar", () => {
    render(<SiteHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Menu akun" }));

    const menu = screen.getByRole("menu", { name: "Menu akun" });
    expect(within(menu).getByRole("menuitem", { name: "Masuk" })).toHaveAttribute("href", "/login");
    expect(within(menu).getByRole("menuitem", { name: "Buat akun" })).toHaveAttribute("href", "/register");
    expect(within(menu).getByRole("menuitem", { name: /Keranjang/ })).toHaveAttribute("href", "/cart");
  });

  it("uses Indonesian navigation and accessible labels", () => {
    render(<SiteHeader />);
    const primaryNavigation = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(within(primaryNavigation).getByRole("link", { name: "Beranda" })).toBeInTheDocument();
    expect(within(primaryNavigation).getByRole("link", { name: "Layanan" })).toBeInTheDocument();
    expect(within(primaryNavigation).getByRole("link", { name: "Cara Berlangganan" })).toBeInTheDocument();
    expect(within(primaryNavigation).getByRole("link", { name: "Laporan Kendala" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buka navigasi" })).toBeInTheDocument();
    // The drawer stays out of the accessibility tree until it is opened.
    expect(within(primaryNavigation).getByRole("link", { name: "Log In" })).toBeInTheDocument();
  });

  it("makes the closed mobile navigation inert and restores focus before closing it", () => {
    render(<SiteHeader />);
    const trigger = screen.getByRole("button", { name: "Buka navigasi" });
    const mobileNavigation = document.querySelector<HTMLElement>("#mobile-navigation");
    expect(mobileNavigation).toHaveAttribute("inert");

    fireEvent.click(trigger);
    expect(mobileNavigation).not.toHaveAttribute("inert");
    const layananLink = within(mobileNavigation!).getByRole("link", { name: "Layanan" });
    layananLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(layananLink);

    expect(trigger).toHaveFocus();
    expect(mobileNavigation).toHaveAttribute("inert");
  });

  it("keeps the desktop and mobile menu order identical", () => {
    render(<SiteHeader />);
    const labels = (selector: string) => Array.from(document.querySelectorAll<HTMLAnchorElement>(selector)).map((link) => link.textContent);
    expect(labels(".figma-desktop-nav-links a")).toEqual(labels(".commerce-mobile-nav-link"));
    expect(labels(".figma-desktop-nav-links a")).toEqual(["Beranda", "Layanan", "Cara Berlangganan", "FAQ", "Laporan Kendala"]);
  });

  it("keeps the footer Indonesian and links to real storefront routes", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("navigation", { name: "Navigasi footer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
    expect(screen.getByRole("link", { name: "Laporan Kendala" })).toHaveAttribute("href", "/laporan-kendala");
    // Halaman baru yang diminta dokumen QA (poin 16).
    expect(screen.getByRole("link", { name: "Testimoni" })).toHaveAttribute("href", "/testimoni");
    expect(screen.getByRole("link", { name: "Tentang Kami" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("heading", { name: "Sosmed" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kategori Produk" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hubungi Kami" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jam Operasional" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "@neclyserviceofficial" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Necly Service" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "+62 899-9228-241" })).not.toHaveLength(0);
    // Alamat email baru dari pemilik (menggantikan neclyservice@gmail.com).
    expect(screen.getByRole("link", { name: "necly.services@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:necly.services@gmail.com",
    );
    expect(screen.getByText(/Kami hadir sebagai layanan digital/)).toBeInTheDocument();
    expect(screen.getByText("© 2026 Necly Services. All rights reserved.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "TikTok" })).not.toBeInTheDocument();
    expect(screen.queryByText("Career services")).not.toBeInTheDocument();
  });
});
