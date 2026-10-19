"use client";

import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { HeaderAccountMenu } from "@/components/header-account-menu";
import { authApi, bootstrapAuth, DEMO_MODE, useAuthStore } from "@/lib/api";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Sebelum ini header selalu menulis "Log In", dan tidak ada satu pun tombol
  // keluar di seluruh aplikasi: sesi hanya bisa berakhir saat cookie kedaluwarsa.
  const user = useAuthStore((state) => state.user);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktop = () => setDesktop(desktopQuery.matches);
    syncDesktop();
    desktopQuery.addEventListener("change", syncDesktop);
    return () => desktopQuery.removeEventListener("change", syncDesktop);
  }, []);

  // Sesi dipulihkan dari cookie refresh sekali per pemuatan halaman; store-nya
  // sendiri yang menyimpan hasilnya, jadi komponen lain ikut menyesuaikan.
  useEffect(() => {
    if (DEMO_MODE) return;
    // Kegagalan di sini berarti pengunjung belum masuk, bukan error yang perlu
    // ditampilkan; header cukup tetap menampilkan "Log In".
    bootstrapAuth().catch(() => undefined);
  }, []);

  const canUseDashboard = user?.role === "admin" || user?.role === "seller";

  const signOut = async () => {
    setSigningOut(true);
    try {
      // clearAuth() selalu dijalankan lewat finally di dalam authApi.logout, jadi
      // header kembali ke keadaan belum masuk walau permintaan ke API gagal.
      await authApi.logout();
    } finally {
      setSigningOut(false);
      setOpen(false);
      router.push("/");
    }
  };

  // Satu sumber kebenaran untuk "menu aktif" supaya nav inline dan drawer mobile
  // tidak pernah menunjuk halaman yang berbeda.
  const isActive = (href: string) => pathname === href || (href === "/products" && pathname.startsWith("/products"));
  const closeMobileMenu = () => {
    mobileMenuTriggerRef.current?.focus();
    setOpen(false);
  };

  return (
    <header className={cn("site-header", open && "mobile-menu-open")}>
      <nav className="figma-desktop-site-nav" aria-label="Navigasi utama desktop" aria-hidden={!desktop}>
        <Link className="figma-desktop-brand" href="/" aria-label="Beranda Necly Services">
          <span><Image src="/design-assets/necly-logo.png" alt="" width={64} height={64} loading="eager" unoptimized /></span>
        </Link>
        <div className="figma-desktop-nav-links">
          {links.map((link) => <Link className={cn(isActive(link.href) && "active")} aria-current={isActive(link.href) ? "page" : undefined} href={link.href} key={link.href}>{link.label}</Link>)}
        </div>
        <HeaderAccountMenu variant="figma" />
      </nav>
      <nav className="commerce-container site-nav" aria-label="Navigasi utama">
        <button className="commerce-menu-trigger desktop-menu-trigger" type="button" aria-label="Buka menu"><Menu size={23} /></button>
        <button ref={mobileMenuTriggerRef} className="commerce-menu-trigger mobile-menu-trigger" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Tutup navigasi" : "Buka navigasi"} onClick={() => setOpen((value) => !value)}>{open ? <X size={26} /> : <Menu size={29} />}</button>
        <BrandLogo compact className="commerce-header-logo" />
        <div className="nav-links">
          {links.map((link) => <Link className={cn("nav-link", isActive(link.href) && "active")} aria-current={isActive(link.href) ? "page" : undefined} href={link.href} key={link.href}>{link.label}</Link>)}
        </div>
        <div className="nav-actions">
          <HeaderAccountMenu variant="pill" />
          <HeaderAccountMenu variant="icon" />
        </div>
      </nav>
      <nav id="mobile-navigation" className="commerce-mobile-nav" aria-label="Navigasi seluler" inert={!open ? true : undefined}>
        {links.map((link) => <Link className={cn("commerce-mobile-nav-link", isActive(link.href) && "active")} aria-current={isActive(link.href) ? "page" : undefined} href={link.href} key={link.href} onClick={closeMobileMenu}>{link.label}</Link>)}
        {user ? (
          <>
            <Link className="commerce-mobile-nav-link" href="/orders" onClick={closeMobileMenu}>Pesanan saya</Link>
            <Link className="commerce-mobile-login commerce-mobile-account-action" href="/akun" onClick={closeMobileMenu}>Akun &amp; keamanan</Link>
            {canUseDashboard && <Link className="commerce-mobile-login" href="/dashboard" onClick={closeMobileMenu}>Dashboard</Link>}
            <button className="commerce-mobile-login commerce-mobile-signout commerce-mobile-account-action" type="button" onClick={signOut} disabled={signingOut}>{signingOut ? "Keluar…" : `Keluar (${user.name.split(" ")[0]})`}</button>
          </>
        ) : (
          <Link className="commerce-mobile-login" href="/login" onClick={closeMobileMenu}>Log In</Link>
        )}
      </nav>
    </header>
  );
}
