import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardGuard } from "@/components/dashboard-guard";

export const metadata: Metadata = { title: { default: "Dasbor", template: "%s | Admin Necly" }, robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell><DashboardGuard>{children}</DashboardGuard></DashboardShell>;
}
