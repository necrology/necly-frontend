"use client";

import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { useDashboardUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const collapsed = useDashboardUiStore((state) => state.sidebarCollapsed);
  const mobileOpen = useDashboardUiStore((state) => state.mobileSidebarOpen);
  const setMobileOpen = useDashboardUiStore((state) => state.setMobileSidebarOpen);
  return <div className={cn("dashboard-layout", collapsed && "collapsed", mobileOpen && "mobile-open")}><button className="dashboard-mobile-overlay" type="button" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)} /><DashboardNav /><div className="dashboard-main"><DashboardTopbar /><main id="main-content" className="dashboard-content">{children}</main></div></div>;
}
