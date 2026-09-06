"use client";

import { Check, Circle, Headphones, Mail, MapPin, PackageCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { formatIDR } from "@/lib/money";
import { getOrderSteps, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import { checkoutApi, DEMO_MODE } from "@/lib/api";

interface OrderData {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  payment_due_at: string;
  items: Array<{
    id: string;
    product_price_id: string;
    product_name: string;
    duration_name: string;
    unit_price: number;
    quantity: number;
  }>;
}

interface OrderClientProps {
  orderId: string;
}

function OrderClientInner({ orderId }: OrderClientProps) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (DEMO_MODE) {
        // Provide demo data in demo mode
        setOrder({
          id: orderId,
          number: `NCL-DEMO-${orderId}`,
          status: "confirmed",
          subtotal: 500_000,
          discount: 0,
          total: 512_500,
          currency: "IDR",
          payment_due_at: new Date().toISOString(),
          items: [
            {
              id: "item-1",
              product_price_id: "price-1",
              product_name: "Netflix Premium (Demo)",
              duration_name: "Monthly",
              unit_price: 186_000,
              quantity: 1,
            },
          ],
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const orderData = await checkoutApi.getOrder(orderId);
        setOrder(orderData);
      } catch {
        setError("Gagal memuat detail pesanan. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 12px", color: "var(--brand)" }} />
        <p className="muted">Memuat pesanan…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center", borderColor: "var(--danger)" }}>
        <div style={{ color: "var(--danger)", marginBottom: 12 }}>
          <PackageCheck size={32} />
        </div>
        <h2 className="h3">Tidak dapat memuat pesanan</h2>
        <p className="muted" style={{ marginTop: 8 }}>{error}</p>
        <button className="button button-primary button-sm" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>Coba lagi</button>
      </div>
    );
  }

  if (!order) return null;

  const statusMap: Record<string, OrderStatus> = {
    pending_payment: "pending_payment",
    confirmed: "confirmed",
    processing: "in_progress",
    delivered: "delivered",
    cancelled: "cancelled",
  };

  const steps = getOrderSteps(statusMap[order.status] || "in_progress");
  const isDemo = DEMO_MODE;

  return (
    <>
      <header className="page-hero">
        <div className="container page-hero-row">
          <div>
            <span className="eyebrow">Pelacakan pesanan</span>
            <h1 className="h1" style={{ marginTop: 12 }}>Pesanan {order.number}</h1>
          </div>
          <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
            <span className={`badge ${isDemo ? "status-info" : "status-success"}`}>
              {isDemo ? "Pesanan sandbox" : order.status === "confirmed" ? "Dibayar" : order.status}
            </span>
            <span className="muted small">Terakhir diperbarui {new Date(order.payment_due_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</span>
          </div>
        </div>
      </header>
      <div className="container order-layout">
        <div style={{ display: "grid", gap: 15 }}>
          {isDemo && <div className="demo-banner"><PackageCheck size={16} /><span>Ini adalah status pesanan contoh. Tidak ada layanan yang dibeli dan tidak ada operator yang ditugaskan.</span></div>}
          <section className="card" style={{ padding: 27 }}>
            <h2 className="h3">Progres</h2>
            <div className="order-timeline">
              {steps.map((step) => (
                <div className={cn("order-step", step.state)} key={step.label}>
                  <span className="order-step-mark">
                    {step.state === "complete" ? <Check size={13} /> : <Circle size={8} fill="currentColor" />}
                  </span>
                  <div>
                    <strong style={{ fontSize: 12 }}>{step.label}</strong>
                    <p className="muted" style={{ margin: "3px 0 0", fontSize: 10 }}>
                      {step.state === "complete"
                        ? "Selesai dan dicatat"
                        : step.state === "current"
                        ? "Tahap saat ini"
                        : step.state === "cancelled"
                        ? "Pesanan tidak akan dilanjutkan"
                        : "Dimulai setelah tahap sebelumnya"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="card" style={{ padding: 27 }}>
            <h2 className="h3">Detail pembayaran</h2>
            <div className="summary-lines">
              <div className="summary-line">
                <span>Subtotal</span>
                <strong>{formatIDR(order.subtotal)}</strong>
              </div>
              {order.discount > 0 && (
                <div className="summary-line">
                  <span>Diskon</span>
                  <strong style={{ color: "var(--success)" }}>-{formatIDR(order.discount)}</strong>
                </div>
              )}
              <div className="summary-line summary-total">
                <span>Total</span>
                <strong>{formatIDR(order.total)}</strong>
              </div>
            </div>
          </section>
          <section className="card" style={{ padding: 27 }}>
            <h2 className="h3">Item pesanan</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {order.items.map((item) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{item.product_name}</strong>
                    <p className="muted" style={{ margin: "2px 0 0", fontSize: 11 }}>{item.duration_name} × {item.quantity}</p>
                  </div>
                  <span className="tabular" style={{ fontSize: 13 }}>{formatIDR(item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside style={{ display: "grid", alignSelf: "start", gap: 15 }}>
          <section className="card" style={{ padding: 22 }}>
            <Headphones size={18} />
            <h2 className="h3" style={{ marginTop: 10 }}>Butuh bantuan?</h2>
            <p className="muted small">Gunakan referensi pesanan <strong>{order.number}</strong> saat menghubungi tim dukungan Necly.</p>
            <Link className="button button-secondary button-sm" href="/about">Informasi dukungan</Link>
          </section>
        </aside>
      </div>
    </>
  );
}

export function OrderClient({ orderId }: OrderClientProps) {
  return (
    <Suspense fallback={<div className="card" style={{ padding: 40, textAlign: "center" }}>Memuat pesanan…</div>}>
      <OrderClientInner orderId={orderId} />
    </Suspense>
  );
}