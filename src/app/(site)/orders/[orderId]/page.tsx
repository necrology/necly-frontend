import type { Metadata } from "next";
import { Check, Circle, Headphones, Mail, MapPin, PackageCheck } from "lucide-react";
import Link from "next/link";
import { dashboardOrders } from "@/data/seed";
import { formatIDR } from "@/lib/money";
import { getOrderSteps, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lacak pesanan", robots: { index: false, follow: false } };

function resolveStatus(orderId: string): OrderStatus {
  const order = dashboardOrders.find((item) => item.id === orderId);
  if (!order) return "in_progress";
  return { "Menunggu pembayaran": "pending_payment", Dibayar: "confirmed", Diproses: "in_progress", Aktif: "delivered", Dibatalkan: "cancelled" }[order.status] as OrderStatus;
}

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = dashboardOrders.find((item) => item.id === orderId) ?? dashboardOrders[0];
  const isDemo = orderId.includes("DEMO") || !dashboardOrders.some((item) => item.id === orderId);
  const steps = getOrderSteps(resolveStatus(orderId));
  return (
    <>
      <header className="page-hero"><div className="container page-hero-row"><div><span className="eyebrow">Pelacakan pesanan</span><h1 className="h1" style={{ marginTop: 12 }}>Pesanan {orderId}</h1></div><div style={{ display: "grid", justifyItems: "end", gap: 8 }}><span className={`badge ${isDemo ? "status-info" : "status-success"}`}>{isDemo ? "Pesanan sandbox" : order.status}</span><span className="muted small">Terakhir diperbarui 06 Sep 2026 · 10:04 WIB</span></div></div></header>
      <div className="container order-layout">
        <div style={{ display: "grid", gap: 15 }}>
          {isDemo && <div className="demo-banner"><PackageCheck size={16} /><span>Ini adalah status pesanan contoh. Tidak ada layanan yang dibeli dan tidak ada operator yang ditugaskan.</span></div>}
          <section className="card" style={{ padding: 27 }}>
            <h2 className="h3">Progres</h2>
            <div className="order-timeline">{steps.map((step) => <div className={cn("order-step", step.state)} key={step.label}><span className="order-step-mark">{step.state === "complete" ? <Check size={13} /> : <Circle size={8} fill="currentColor" />}</span><div><strong style={{ fontSize: 12 }}>{step.label}</strong><p className="muted" style={{ margin: "3px 0 0", fontSize: 10 }}>{step.state === "complete" ? "Selesai dan dicatat" : step.state === "current" ? "Tahap saat ini" : step.state === "cancelled" ? "Pesanan tidak akan dilanjutkan" : "Dimulai setelah tahap sebelumnya"}</p></div></div>)}</div>
          </section>
          <section className="card" style={{ padding: 27 }}><h2 className="h3">Aktivitas</h2><div className="activity-list"><div className="activity-row"><span className="activity-dot"/><span><strong>Ringkasan proyek ditinjau</strong><br/><span className="muted">Kontak dan detail hasil tersedia bagi operator.</span></span><time className="muted">10:04</time></div><div className="activity-row"><span className="activity-dot"/><span><strong>Status pembayaran dikonfirmasi</strong><br/><span className="muted">Persetujuan sandbox dicatat untuk demonstrasi ini.</span></span><time className="muted">09:43</time></div><div className="activity-row"><span className="activity-dot"/><span><strong>Pesanan dibuat</strong><br/><span className="muted">Referensi {orderId} digenerate.</span></span><time className="muted">09:41</time></div></div></section>
        </div>
        <aside style={{ display: "grid", alignSelf: "start", gap: 15 }}>
          <section className="card" style={{ padding: 22 }}><span className="eyebrow">Produk</span><h2 className="h3" style={{ marginTop: 9 }}>{order.service}</h2><div className="summary-lines"><div className="summary-line"><span>Harga awal</span><strong>{formatIDR(order.amount)}</strong></div><div className="summary-line"><span>Biaya layanan</span><strong>{formatIDR(Math.round(order.amount * .025))}</strong></div><div className="summary-line summary-total"><span>Total demo</span><strong>{formatIDR(order.amount + Math.round(order.amount * .025))}</strong></div></div></section>
          <section className="card" style={{ padding: 22 }}><h2 className="h3">Kontak proyek</h2><div style={{ display: "grid", gap: 11, marginTop: 15, fontSize: 11 }}><span><Mail size={13} style={{ display: "inline", marginRight: 8 }} />{order.customerEmail}</span><span><MapPin size={13} style={{ display: "inline", marginRight: 8 }} />Jakarta, Indonesia</span></div></section>
          <section className="card" style={{ padding: 22 }}><Headphones size={18} /><h2 className="h3" style={{ marginTop: 10 }}>Butuh bantuan?</h2><p className="muted small">Gunakan referensi pesanan Anda saat menghubungi tim dukungan Necly Services.</p><Link className="button button-secondary button-sm" href="/about">Informasi dukungan</Link></section>
        </aside>
      </div>
    </>
  );
}