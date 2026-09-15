"use client";

import Link from "next/link";
import { Menu, UserRound, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktop = () => setDesktop(desktopQuery.matches);
    syncDesktop();
    desktopQuery.addEventListener("change", syncDesktop);
    return () => desktopQuery.removeEventListener("change", syncDesktop);
  }, []);

  return (
    <header className={cn("site-header", open && "mobile-menu-open")}>
      <nav className="figma-desktop-site-nav" aria-label="Navigasi utama desktop" aria-hidden={!desktop}>
        <Link className="figma-desktop-brand" href="/" aria-label="Beranda Necly Services">
          <span><Image src="/figma/homepage-logo.png" alt="" width={64} height={64} priority /></span>
        </Link>
        <div className="figma-desktop-nav-links">
          <Link href="/products">Layanan</Link>
          <Link href="/cara-berlangganan">Cara Berlangganan</Link>
          <Link href="/faq">FAQ</Link>
          <span>Blog</span>
          <Link href="/laporan-kendala">Laporan Kendala</Link>
        </div>
        <Link className="figma-desktop-profile" href="/login" aria-label="Log in"><Image src="/figma/user-circle.svg" alt="" width={49} height={49} /></Link>
      </nav>
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
