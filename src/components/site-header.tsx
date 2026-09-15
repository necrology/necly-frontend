"use client";

import Link from "next/link";
import { Menu, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const links = [
  { label: "Beranda", href: "/" },
  { label: "Layanan", href: "/products" },
  { label: "Cara Berlangganan", href: "/cara-berlangganan" },
  { label: "FAQ", href: "/faq" },
  { label: "Laporan Kendala", href: "/laporan-kendala" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className={cn("site-header", open && "mobile-menu-open")}>
      <nav className="commerce-container site-nav" aria-label="Navigasi utama">
        <button className="commerce-menu-trigger desktop-menu-trigger" type="button" aria-label="Buka menu"><Menu size={23} /></button>
        <button className="commerce-menu-trigger mobile-menu-trigger" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Tutup navigasi" : "Buka navigasi"} onClick={() => setOpen((value) => !value)}>{open ? <X size={26} /> : <Menu size={29} />}</button>
        <BrandLogo compact className="commerce-header-logo" />
        <div className="nav-links">
          {links.map((link) => <Link className={cn("nav-link", (pathname === link.href || (link.href === "/products" && pathname.startsWith("/products"))) && "active")} href={link.href} key={link.href}>{link.label}</Link>)}
        </div>
        <div className="nav-actions">
          <Link className="commerce-login-link" href="/login"><UserRound size={18} /><span>Log In</span></Link>
          <Link className="commerce-mobile-profile" href="/login" aria-label="Log in"><UserRound size={27} /></Link>
        </div>
      </nav>
      <nav id="mobile-navigation" className="commerce-mobile-nav" aria-label="Navigasi seluler" aria-hidden={!open}>
        {links.map((link) => <Link className={cn("commerce-mobile-nav-link", pathname === link.href && "active")} href={link.href} key={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
        <Link className="commerce-mobile-login" href="/login" onClick={() => setOpen(false)}>Log In</Link>
      </nav>
    </header>
  );
}
