"use client";

import { useEffect } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { useDashboardUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const collapsed = useDashboardUiStore((state) => state.sidebarCollapsed);
  const mobileOpen = useDashboardUiStore((state) => state.mobileSidebarOpen);
  const setMobileOpen = useDashboardUiStore((state) => state.setMobileSidebarOpen);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <div className={cn("dashboard-layout", collapsed && "collapsed", mobileOpen && "mobile-open")}>
      <button className="dashboard-mobile-overlay" type="button" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)} />
      <DashboardNav />
      <div className="dashboard-main">
        <DashboardTopbar />
        <main id="main-content" className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
