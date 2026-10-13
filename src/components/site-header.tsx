"use client";

import Link from "next/link";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
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
  // Sebelum ini header selalu menulis "Log In", dan tidak ada satu pun tombol
  // keluar di seluruh aplikasi: sesi hanya bisa berakhir saat cookie kedaluwarsa.
  const user = useAuthStore((state) => state.user);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      // clearAuth() selalu dijalankan lewat finally di dalam authApi.logout, jadi
      // header kembali ke keadaan belum masuk walau permintaan ke API gagal.
      await authApi.logout();
    } finally {
      setSigningOut(false);
      setAccountOpen(false);
      setOpen(false);
      router.push("/");
    }
  };

  const canUseDashboard = user?.role === "admin" || user?.role === "seller";

  // Satu sumber kebenaran untuk "menu aktif" supaya nav inline dan drawer mobile
  // tidak pernah menunjuk halaman yang berbeda.
  const isActive = (href: string) => pathname === href || (href === "/products" && pathname.startsWith("/products"));
  const closeMobileMenu = () => {
    mobileMenuTriggerRef.current?.focus();
    setOpen(false);
  };

  const accountMenu = user ? (
    <div className="commerce-account" ref={accountRef}>
      <button className="commerce-login-link commerce-account-trigger" type="button" aria-expanded={accountOpen} aria-haspopup="menu" onClick={() => setAccountOpen((value) => !value)}>
        <span className="commerce-account-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase() || "N"}</span>
        <span className="commerce-account-name">{user.name.split(" ")[0]}</span>
      </button>
      {accountOpen && (
        <div className="commerce-account-menu" role="menu">
          <p className="commerce-account-identity"><strong>{user.name}</strong><small>{user.email}</small></p>
          <Link role="menuitem" href="/akun" onClick={() => setAccountOpen(false)}>Akun &amp; keamanan</Link>
          {canUseDashboard && <Link role="menuitem" href="/dashboard" onClick={() => setAccountOpen(false)}>Dashboard</Link>}
          <Link role="menuitem" href="/products" onClick={() => setAccountOpen(false)}>Lihat Layanan</Link>
          <button role="menuitem" type="button" onClick={signOut} disabled={signingOut}>{signingOut ? "Keluar…" : <><LogOut size={14} /> Keluar</>}</button>
        </div>
      )}
    </div>
  ) : (
    <Link className="commerce-login-link" href="/login"><UserRound size={18} /><span>Log In</span></Link>
  );

  return (
    <header className={cn("site-header", open && "mobile-menu-open")}>
      <nav className="figma-desktop-site-nav" aria-label="Navigasi utama desktop" aria-hidden={!desktop}>
        <Link className="figma-desktop-brand" href="/" aria-label="Beranda Necly Services">
          <span><Image src="/design-assets/necly-logo.png" alt="" width={64} height={64} loading="eager" unoptimized /></span>
        </Link>
        <div className="figma-desktop-nav-links">
          {links.map((link) => <Link className={cn(isActive(link.href) && "active")} aria-current={isActive(link.href) ? "page" : undefined} href={link.href} key={link.href}>{link.label}</Link>)}
        </div>
        <Link className="figma-desktop-profile" href={canUseDashboard ? "/dashboard" : "/login"} aria-label={user ? `Akun ${user.name}` : "Log in"}><Image src="/figma/user-circle.svg" alt="" width={49} height={49} /></Link>
      </nav>
      <nav className="commerce-container site-nav" aria-label="Navigasi utama">
        <button className="commerce-menu-trigger desktop-menu-trigger" type="button" aria-label="Buka menu"><Menu size={23} /></button>
        <button ref={mobileMenuTriggerRef} className="commerce-menu-trigger mobile-menu-trigger" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Tutup navigasi" : "Buka navigasi"} onClick={() => setOpen((value) => !value)}>{open ? <X size={26} /> : <Menu size={29} />}</button>
        <BrandLogo compact className="commerce-header-logo" />
        <div className="nav-links">
          {links.map((link) => <Link className={cn("nav-link", isActive(link.href) && "active")} aria-current={isActive(link.href) ? "page" : undefined} href={link.href} key={link.href}>{link.label}</Link>)}
        </div>
        <div className="nav-actions">
          {accountMenu}
          <Link className="commerce-mobile-profile" href={canUseDashboard ? "/dashboard" : "/login"} aria-label={user ? `Akun ${user.name}` : "Log in"}><UserRound size={27} /></Link>
        </div>
      </nav>
      <nav id="mobile-navigation" className="commerce-mobile-nav" aria-label="Navigasi seluler" inert={!open ? true : undefined}>
        {links.map((link) => <Link className={cn("commerce-mobile-nav-link", isActive(link.href) && "active")} aria-current={isActive(link.href) ? "page" : undefined} href={link.href} key={link.href} onClick={closeMobileMenu}>{link.label}</Link>)}
        {user ? (
          <>
            <Link className="commerce-mobile-login" href="/akun" onClick={closeMobileMenu}>Akun &amp; keamanan</Link>
            {canUseDashboard && <Link className="commerce-mobile-login" href="/dashboard" onClick={closeMobileMenu}>Dashboard</Link>}
            <button className="commerce-mobile-login commerce-mobile-signout" type="button" onClick={signOut} disabled={signingOut}>{signingOut ? "Keluar…" : `Keluar (${user.name.split(" ")[0]})`}</button>
          </>
        ) : (
          <Link className="commerce-mobile-login" href="/login" onClick={closeMobileMenu}>Log In</Link>
        )}
      </nav>
    </header>
  );
}
