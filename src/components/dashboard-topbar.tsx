"use client";

import { Bell, ChevronDown, LogOut, Menu, PanelLeftClose, Search, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authApi, useAuthStore } from "@/lib/api";
import { useDashboardUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function DashboardTopbar() {
  const router = useRouter();
  const toggle = useDashboardUiStore((state) => state.toggleSidebar);
  const mobileOpen = useDashboardUiStore((state) => state.mobileSidebarOpen);
  const setMobileOpen = useDashboardUiStore((state) => state.setMobileSidebarOpen);
  const user = useAuthStore((state) => state.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  const toggleSidebar = () => {
    // Di layar sempit tombol hamburger harus bisa membuka sekaligus menutup
    // drawer. Sebelumnya nilainya selalu `true`, sehingga klik kedua tidak
    // berefek dan drawer terasa tidak bisa ditutup.
    if (typeof window !== "undefined" && window.innerWidth <= 800) {
      setMobileOpen(!mobileOpen);
      return;
    }
    toggle();
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await authApi.logout();
    } finally {
      setSigningOut(false);
      setProfileOpen(false);
      router.push("/login");
    }
  };

  const displayName = user?.name?.trim() || "Ayu Admin";
  const displayRole = user?.role === "admin" ? "Administrator" : user?.role === "seller" ? "Penjual" : user ? "Pelanggan" : "Operasional";
  const displayEmail = user?.email?.trim() || "Sesi demo dashboard";

  return (
    <header className="dashboard-topbar">
      <button
        className="icon-button sidebar-toggle"
        type="button"
        onClick={toggleSidebar}
        aria-label={mobileOpen ? "Tutup navigasi dashboard" : "Buka navigasi dashboard"}
        aria-expanded={mobileOpen}
      >
        <Menu size={16} className="mobile-menu-button" />
        <PanelLeftClose size={16} className="nav-copy" />
      </button>
      <div className="input-wrap topbar-search">
        <Search size={14} />
        <input className="input" type="search" placeholder="Cari pesanan, pelanggan, atau produk…" aria-label="Cari di dashboard" />
        <span className="topbar-shortcut" style={{ position: "absolute", right: 10, top: 12, fontSize: 9, color: "var(--faint)" }}>Ctrl K</span>
      </div>
      <span className="topbar-spacer" />
      <Link className="icon-button cart-link" href="/dashboard/notifications" aria-label="Notifikasi">
        <Bell size={16} />
        <span className="cart-count">3</span>
      </Link>
      <div className="dashboard-profile" ref={profileRef}>
        <button
          className="profile-button"
          type="button"
          aria-label="Menu profil akun"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen((value) => !value)}
        >
          <span className="profile-avatar" aria-hidden="true">{initialsOf(displayName)}</span>
          <span className="profile-copy" style={{ textAlign: "left" }}>
            <strong style={{ display: "block", fontSize: 10 }}>{displayName}</strong>
            <span className="muted" style={{ fontSize: 8 }}>{displayRole}</span>
          </span>
          <ChevronDown size={12} className={cn("profile-copy", "profile-chevron", profileOpen && "open")} />
        </button>
        {profileOpen && (
          <div className="dashboard-profile-menu" role="menu" aria-label="Menu akun">
            <div className="dashboard-profile-identity">
              <span className="profile-avatar" aria-hidden="true">{initialsOf(displayName)}</span>
              <div>
                <strong>{displayName}</strong>
                <small>{displayEmail}</small>
                <span>{displayRole}</span>
              </div>
            </div>
            <Link role="menuitem" href="/akun" onClick={() => setProfileOpen(false)}>
              <UserRound size={15} aria-hidden="true" /> Profil &amp; keamanan
            </Link>
            <Link role="menuitem" href="/" onClick={() => setProfileOpen(false)}>
              <Store size={15} aria-hidden="true" /> Kembali ke marketplace
            </Link>
            <button role="menuitem" type="button" onClick={signOut} disabled={signingOut}>
              <LogOut size={15} aria-hidden="true" /> {signingOut ? "Keluar…" : "Keluar"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
