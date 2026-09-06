"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCartStore } from "@/stores/cart-store";
import { cn } from "@/lib/utils";

const links = [
  { label: "Jelajahi", href: "/products" },
  { label: "Cara kerja", href: "/#cara-kerja" },
  { label: "Tentang", href: "/about" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const count = useCartStore((state) => state.itemCount());

  return (
    <header className="site-header">
      <nav className="container site-nav" aria-label="Navigasi utama">
        <BrandLogo />
        <div className="nav-links">
          {links.map((link) => (
            <Link
              className={cn("nav-link", pathname === link.href && "active")}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <Link className="icon-button" href="/products" aria-label="Cari produk">
            <Search size={17} />
          </Link>
          <Link className="icon-button cart-link" href="/cart" aria-label={`Keranjang dengan ${hydrated ? count : 0} produk`}>
            <ShoppingBag size={17} />
            {hydrated && count > 0 && <span className="cart-count">{count}</span>}
          </Link>
          <Link className="button button-ghost" href="/login">Masuk</Link>
          <Link className="button button-primary" href="/register">Daftar</Link>
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? "Tutup navigasi" : "Buka navigasi"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>
      <nav id="mobile-navigation" className={cn("mobile-nav", open && "open")} aria-label="Navigasi seluler">
        {links.map((link) => <Link className="nav-link" href={link.href} key={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
        <div className="mobile-nav-actions">
          <Link className="button button-secondary" href="/login">Masuk</Link>
          <Link className="button button-primary" href="/register">Daftar</Link>
        </div>
      </nav>
    </header>
  );
}
