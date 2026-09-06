"use client";

import {
  Boxes,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  FileClock,
  Gift,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { useDashboardUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Pantau",
    items: [
      { label: "Ringkasan", href: "/dashboard", icon: LayoutDashboard },
      { label: "Notifikasi", href: "/dashboard/notifications", icon: FileClock },
    ],
  },
  {
    label: "Operasional",
    items: [
      { label: "Produk", href: "/dashboard/products", icon: ShoppingBag },
      { label: "Inventaris", href: "/dashboard/inventory", icon: Boxes },
      { label: "Pesanan", href: "/dashboard/orders", icon: ClipboardList },
      { label: "Pelanggan", href: "/dashboard/customers", icon: Users },
      { label: "Pembayaran", href: "/dashboard/payments", icon: CircleDollarSign },
    ],
  },
  {
    label: "Pengembangan",
    items: [
      { label: "Laporan", href: "/dashboard/reports", icon: ReceiptText },
      { label: "Voucher", href: "/dashboard/vouchers", icon: Gift },
      { label: "Log audit", href: "/dashboard/audit-log", icon: PackageSearch },
    ],
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const collapsed = useDashboardUiStore((state) => state.sidebarCollapsed);
  const toggle = useDashboardUiStore((state) => state.toggleSidebar);
  const setMobileOpen = useDashboardUiStore((state) => state.setMobileSidebarOpen);
  return <aside className="dashboard-sidebar"><div style={{ display: "flex", alignItems: "center" }}><BrandLogo href="/dashboard" compact={collapsed} /><button className="table-action dashboard-nav-close" style={{ marginLeft: "auto", marginRight: 11 }} type="button" onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi"><X size={14} /></button></div><nav className="dashboard-nav" aria-label="Navigasi dashboard">{groups.map((group) => <div key={group.label}><div className="dashboard-nav-label">{group.label}</div>{group.items.map(({ label, href, icon: Icon }) => <Link key={href} href={href} title={collapsed ? label : undefined} className={cn("dashboard-nav-link", pathname === href && "active")} onClick={() => setMobileOpen(false)}><Icon size={15} /><span className="nav-copy">{label}</span></Link>)}</div>)}</nav><div className="sidebar-footer"><Link className="dashboard-nav-link" href="/"><Settings size={15} /><span className="nav-copy">Kembali ke marketplace</span></Link><button className="dashboard-nav-link" style={{ width: "100%", border: 0, cursor: "pointer" }} type="button" onClick={toggle}><ChevronLeft size={15} style={{ transform: collapsed ? "rotate(180deg)" : undefined }} /><span className="nav-copy">Ciutkan sidebar</span></button></div></aside>;
}
