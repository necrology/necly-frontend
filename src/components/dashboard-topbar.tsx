"use client";

import { Bell, ChevronDown, Menu, PanelLeftClose, Search } from "lucide-react";
import Link from "next/link";
import { useDashboardUiStore } from "@/stores/ui-store";

export function DashboardTopbar() {
  const toggle = useDashboardUiStore((state) => state.toggleSidebar);
  const setMobileOpen = useDashboardUiStore((state) => state.setMobileSidebarOpen);
  return <header className="dashboard-topbar"><button className="icon-button sidebar-toggle" type="button" onClick={() => { if (window.innerWidth <= 800) setMobileOpen(true); else toggle(); }} aria-label="Buka navigasi dashboard"><Menu size={16} className="mobile-menu-button" /><PanelLeftClose size={16} className="nav-copy" /></button><div className="input-wrap topbar-search"><Search size={14} /><input className="input" type="search" placeholder="Cari pesanan, pelanggan, atau produk…" aria-label="Cari di dashboard" /><span className="topbar-shortcut" style={{ position: "absolute", right: 10, top: 12, fontSize: 9, color: "var(--faint)" }}>Ctrl K</span></div><span className="topbar-spacer"/><Link className="icon-button cart-link" href="/dashboard/notifications" aria-label="Notifikasi"><Bell size={16}/><span className="cart-count">3</span></Link><button className="profile-button" type="button" aria-label="Menu profil"><span className="profile-avatar">AA</span><span className="profile-copy" style={{ textAlign: "left" }}><strong style={{ display: "block", fontSize: 10 }}>Ayu Admin</strong><span className="muted" style={{ fontSize: 8 }}>Operasional</span></span><ChevronDown size={12} className="profile-copy" /></button></header>;
}
