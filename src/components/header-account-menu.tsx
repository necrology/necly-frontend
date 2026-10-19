"use client";

import { LogOut, ReceiptText, ShoppingCart, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authApi, useAuthStore } from "@/lib/api";
import { useCartStore } from "@/stores/cart-store";
import { cn } from "@/lib/utils";

type Variant = "figma" | "icon" | "pill";

/**
 * Menu akun yang dibuka dari ikon atau pil nama di header.
 *
 * Ikon dulu langsung menautkan ke satu halaman, dan untuk pelanggan tautan itu
 * menunjuk /login — sehingga setiap klik terlempar ke halaman masuk. Sekarang
 * ikon membuka menu berisi profil, keranjang, dan keluar.
 */
export function HeaderAccountMenu({ variant, className }: { variant: Variant; className?: string }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      // clearAuth() selalu dijalankan lewat finally di dalam authApi.logout.
      await authApi.logout();
    } finally {
      setSigningOut(false);
      setOpen(false);
      router.push("/");
    }
  };

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const canUseDashboard = user?.role === "admin" || user?.role === "seller";
  const firstName = user?.name.split(" ")[0] ?? "";

  // Pil nama hanya muncul di layar ≥768px, dan saat belum masuk ia tetap
  // berperan sebagai tautan "Log In" seperti sebelumnya.
  if (variant === "pill" && !user) {
    return <Link className="commerce-login-link" href="/login"><UserRound size={18} /><span>Log In</span></Link>;
  }

  const trigger = variant === "figma" ? (
    <button className="figma-desktop-profile" type="button" aria-haspopup="menu" aria-expanded={open} aria-label={user ? `Menu akun ${user.name}` : "Menu akun"} onClick={() => setOpen((value) => !value)}>
      <Image src="/figma/user-circle.svg" alt="" width={49} height={49} />
    </button>
  ) : variant === "icon" ? (
    <button className="commerce-mobile-profile" type="button" aria-haspopup="menu" aria-expanded={open} aria-label={user ? `Menu akun ${user.name}` : "Menu akun"} onClick={() => setOpen((value) => !value)}>
      <UserRound size={27} />
    </button>
  ) : (
    <button className="commerce-login-link commerce-account-trigger" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="commerce-account-avatar" aria-hidden="true">{user!.name.trim().charAt(0).toUpperCase() || "N"}</span>
      <span className="commerce-account-name">{firstName}</span>
    </button>
  );

  return (
    <div className={cn("commerce-account", `is-${variant}`, className)} ref={ref}>
      {trigger}
      {open && (
        <div className="commerce-account-menu" role="menu" aria-label="Menu akun">
          {user ? (
            <>
              <p className="commerce-account-identity"><strong>{user.name}</strong><small>{user.email}</small></p>
              <Link role="menuitem" href="/akun" onClick={close}><UserRound size={15} aria-hidden="true" /> Profil</Link>
              <Link role="menuitem" href="/orders" onClick={close}><ReceiptText size={15} aria-hidden="true" /> Pesanan saya</Link>
              <Link role="menuitem" href="/cart" onClick={close}>
                <ShoppingCart size={15} aria-hidden="true" /> Keranjang
                {cartCount > 0 && <span className="commerce-account-badge">{cartCount}</span>}
              </Link>
              {canUseDashboard && <Link role="menuitem" href="/dashboard" onClick={close}>Dashboard</Link>}
              <button role="menuitem" type="button" onClick={signOut} disabled={signingOut}>
                <LogOut size={15} aria-hidden="true" /> {signingOut ? "Keluar…" : "Keluar"}
              </button>
            </>
          ) : (
            <>
              <Link role="menuitem" href="/login" onClick={close}>Masuk</Link>
              <Link role="menuitem" href="/register" onClick={close}>Buat akun</Link>
              <Link role="menuitem" href="/cart" onClick={close}>
                <ShoppingCart size={15} aria-hidden="true" /> Keranjang
                {cartCount > 0 && <span className="commerce-account-badge">{cartCount}</span>}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
