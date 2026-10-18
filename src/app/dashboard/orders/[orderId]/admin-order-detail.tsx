"use client";

import { ArrowLeft, CreditCard, PackageCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ApiError, adminApi, bootstrapAuth, DEMO_MODE, type ApiOrder } from "@/lib/api";
import { formatDateTimeWIB, formatIDR } from "@/lib/money";
import { orderStatusLabel } from "@/lib/order-status";
import { dashboardOrders } from "@/data/seed";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LoadError = {
  kind: "not_found" | "forbidden" | "unauthorized" | "generic";
  message: string;
};

const paymentStatuses: Record<string, string> = {
  pending: "Menunggu",
  paid: "Dibayar",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  failed: "Gagal",
  refunded: "Dikembalikan",
};

function demoOrder(orderId: string): ApiOrder {
  const demo = dashboardOrders.find((item) => item.id === orderId) ?? dashboardOrders[0];
  const statusMap: Record<string, string> = {
    "Menunggu pembayaran": "pending_payment",
    Dibayar: "paid",
    Diproses: "processing",
    Aktif: "delivered",
    Dibatalkan: "cancelled",
  };

  return {
    id: demo.id,
    number: demo.id,
    status: statusMap[demo.status] ?? "pending_payment",
    subtotal: demo.amount,
    discount: 0,
    total: demo.amount,
    currency: "IDR",
    payment_due_at: "",
    items: [{
      id: `${demo.id}-item`,
      product_price_id: `${demo.id}-price`,
      product_name: demo.service,
      duration_name: demo.duration,
      unit_price: demo.amount,
      quantity: 1,
      device_count: 1,
      line_total: demo.amount,
    }],
    payments: [],
    customer: { id: demo.customerEmail, name: demo.customer, email: demo.customerEmail },
    created_at: "",
    updated_at: "",
  };
}

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (DEMO_MODE) {
      setOrder(demoOrder(orderId));
      setLoading(false);
      return;
    }

    try {
      const user = await bootstrapAuth();
      if (!user) {
        setOrder(null);
        setError({ kind: "unauthorized", message: "Sesi Anda sudah berakhir. Masuk kembali untuk melihat pesanan ini." });
        return;
      }
      if (user.role !== "admin") {
        // Pertahanan berlapis: guard layout sudah menolak penjual, dan route
        // ini tidak boleh meminta data admin untuk peran selain admin.
        setOrder(null);
        setError({ kind: "forbidden", message: "Halaman detail pesanan hanya untuk admin." });
        return;
      }
      if (!UUID.test(orderId)) {
        setOrder(null);
        setError({ kind: "not_found", message: "Pesanan tidak ditemukan." });
        return;
      }

      setOrder(await adminApi.getOrder(orderId));
    } catch (failure) {
      setOrder(null);
      if (failure instanceof ApiError) {
        if (failure.status === 404 || failure.status === 400 || failure.status === 403) {
          setError({ kind: "not_found", message: "Pesanan tidak ditemukan." });
        } else if (failure.status === 401) {
          setError({ kind: "unauthorized", message: "Sesi Anda sudah berakhir. Masuk kembali untuk melihat pesanan ini." });
        } else {
          setError({ kind: "generic", message: "Gagal memuat detail pesanan. Silakan coba lagi." });
        }
      } else {
        setError({ kind: "generic", message: "Gagal memuat detail pesanan. Silakan coba lagi." });
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadOrder();
    });
    return () => { cancelled = true; };
  }, [loadOrder, reloadToken]);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <RefreshCw className="commerce-spin" size={24} style={{ margin: "0 auto 12px", color: "var(--brand)" }} />
          <p className="muted">Memuat detail pesanan…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    const title = error?.kind === "not_found"
      ? "Pesanan tidak ditemukan"
      : error?.kind === "forbidden"
        ? "Akses ditolak"
        : error?.kind === "unauthorized"
          ? "Sesi tidak valid"
          : "Tidak dapat memuat pesanan";
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 420 }} role="alert">
          <PackageCheck size={30} style={{ margin: "0 auto 12px", color: "var(--muted)" }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>{error?.message}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="button button-secondary button-sm" href="/dashboard/orders">
              <ArrowLeft size={13} /> Kembali ke pesanan
            </Link>
            {error?.kind !== "not_found" && error?.kind !== "forbidden" && (
              <button className="button button-primary button-sm" type="button" onClick={() => setReloadToken((value) => value + 1)}>
                Coba lagi
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const payments = order.payments ?? [];
  const items = order.items ?? [];

  return (
    <div className="dashboard-page">
      <PageHeader
        title={`Pesanan ${order.number}`}
        description={`Status ${orderStatusLabel(order.status)} · dibuat ${order.created_at ? formatDateTimeWIB(order.created_at) : "—"} WIB`}
        actions={
          <Link className="button button-secondary button-sm" href="/dashboard/orders">
            <ArrowLeft size={13} /> Kembali
          </Link>
        }
      />

      {DEMO_MODE && (
        <div className="demo-banner"><PackageCheck size={15} /><span>Pesanan sandbox. Tidak ada layanan yang dibeli dan tidak ada pembayaran nyata.</span></div>
      )}

      <section className="metric-grid" aria-label="Ringkasan pesanan">
        <article className="card metric-card">
          <div className="metric-label"><span>Status pesanan</span></div>
          <div style={{ marginTop: 8 }}><StatusBadge status={order.status} /></div>
        </article>
        <article className="card metric-card">
          <div className="metric-label"><span>Total</span></div>
          <strong className="metric-value tabular">{formatIDR(order.total)}</strong>
          <span className="metric-change">{order.currency}</span>
        </article>
        <article className="card metric-card">
          <div className="metric-label"><span>Subtotal</span></div>
          <strong className="metric-value tabular">{formatIDR(order.subtotal)}</strong>
        </article>
        <article className="card metric-card">
          <div className="metric-label"><span>Diskon</span></div>
          <strong className="metric-value tabular">{formatIDR(order.discount)}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">Item pesanan</h2>
            <span className="muted" style={{ fontSize: 9 }}>{items.length} item</span>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Durasi</th>
                  <th>Jumlah</th>
                  <th>Perangkat</th>
                  <th>Harga satuan</th>
                  <th>Total baris</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>Belum ada item pesanan.</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id}>
                    <td className="table-primary">{item.product_name}</td>
                    <td>{item.duration_name}</td>
                    <td className="tabular">{item.quantity}</td>
                    <td className="tabular">{item.device_count ?? "—"}</td>
                    <td className="tabular">{formatIDR(item.unit_price)}</td>
                    <td className="tabular">{formatIDR(item.line_total ?? item.unit_price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">Pembayaran</h2>
            <CreditCard size={14} className="muted" />
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Jumlah</th>
                  <th>Referensi</th>
                  <th>Dibayar</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Belum ada pembayaran tercatat.</td></tr>
                ) : payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="table-primary">{payment.provider}</td>
                    <td><StatusBadge status={payment.status} /></td>
                    <td className="tabular">{formatIDR(payment.amount)}</td>
                    <td className="tabular">{payment.provider_payment_id ?? "—"}</td>
                    <td>{payment.paid_at ? `${formatDateTimeWIB(payment.paid_at)} WIB` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small" style={{ margin: "12px 0 0" }}>
            Status pembayaran ditampilkan apa adanya dari API. Tidak ada metode atau nominal yang ditambahkan di UI.
          </p>
        </article>
      </section>

      <section className="card" style={{ padding: 22 }}>
        <h2 className="panel-title">Pelanggan dan jadwal</h2>
        <div className="summary-lines" style={{ marginTop: 12 }}>
          <div className="summary-line"><span>Nama</span><strong>{order.customer?.name ?? "—"}</strong></div>
          <div className="summary-line"><span>Email</span><strong>{order.customer?.email ?? "—"}</strong></div>
          <div className="summary-line"><span>User ID</span><strong className="tabular">{order.user_id ?? "—"}</strong></div>
          <div className="summary-line"><span>Batas pembayaran</span><strong>{order.payment_due_at ? `${formatDateTimeWIB(order.payment_due_at)} WIB` : "—"}</strong></div>
          <div className="summary-line"><span>Terakhir diperbarui</span><strong>{order.updated_at ? `${formatDateTimeWIB(order.updated_at)} WIB` : "—"}</strong></div>
          {order.shipping_address && <div className="summary-line"><span>Alamat</span><strong>{order.shipping_address}</strong></div>}
          {order.notes && <div className="summary-line"><span>Catatan</span><strong>{order.notes}</strong></div>}
        </div>
      </section>
    </div>
  );
}
