"use client";

import { Download, Eye, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { dashboardOrders } from "@/data/seed";
import { formatIDR, formatDateID } from "@/lib/money";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiOrderToDashboardOrder } from "@/lib/admin-mappers";
import type { DashboardOrder } from "@/lib/types";
import type { ApiOrder } from "@/lib/api";

const statuses = ["Semua", "Menunggu pembayaran", "Dibayar", "Diproses", "Aktif", "Dibatalkan"] as const;
type StatusType = (typeof statuses)[number];

export default function OrdersAdminPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusType>("Semua");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiOrders, setApiOrders] = useState<DashboardOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      bootstrapAuth().then((user) => {
        if (user?.role === "admin") {
          adminApi.listOrders({ page: 1, per_page: 50 }).then((res) => {
            try {
              const orders = (res.orders as unknown as ApiOrder[]) ?? [];
              const mappedOrders = orders.map(mapApiOrderToDashboardOrder);
              setApiOrders(mappedOrders);
              setLoading(false);
            } catch {
              setError("Gagal memproses data pesanan dari API");
              setLoading(false);
            }
          }).catch(() => {
            setError("Gagal memuat pesanan dari server");
            setLoading(false);
          });
        } else {
          setError("Akses ditolak: hanya admin yang dapat mengelola pesanan");
          setLoading(false);
        }
      });
    }
  }, []);

  const sourceOrders = DEMO_MODE ? dashboardOrders : apiOrders ?? [];

  const rows = useMemo(
    () =>
      sourceOrders.filter((order: DashboardOrder) => {
        const s = overrides[order.id] ?? order.status;
        return (status === "Semua" || s === status) && (order.id + order.customer + order.service).toLowerCase().includes(query.toLowerCase());
      }),
    [query, status, overrides, sourceOrders],
  );

  const unavailable = (action: string) => {
    setNotice(`${action} belum tersedia. Hubungkan ke API admin untuk mengaktifkan.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat pesanan</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            {error}
          </p>
          <button
            className="button button-primary button-sm"
            onClick={() => window.location.reload()}
            style={{ minWidth: 160 }}
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Pesanan akun sharing"
        description="Kelola pesanan akun langganan sharing, terima pembayaran, dan koordinasikan aktivasi slot anggota ke pelanggan."
        actions={<button className="button button-secondary button-sm" onClick={() => unavailable("Ekspor pesanan")}><Download size={13} /> Ekspor pesanan</button>}
      />
      {notice && <div className="notice success" role="status">{notice}</div>}
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari pesanan, pelanggan, atau produk…" /></div>
        <select className="select" style={{ width: 170 }} value={status} onChange={(e) => setStatus(e.target.value as StatusType)}>
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} pesanan</span>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pesanan</th>
                <th>Pelanggan</th>
                <th>Produk</th>
                <th>Durasi</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th>Jatuh tempo</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={10} className="muted" style={{ textAlign: "center" }}>Belum ada pesanan.</td></tr>
              ) : rows.map((order) => {
                const current = overrides[order.id] ?? order.status;
                return (
                  <tr key={order.id}>
                    <td className="table-primary">{order.id}</td>
                    <td>
                      <span className="table-primary">{order.customer}</span>
                      <br />
                      <span className="table-secondary">{order.customerEmail}</span>
                    </td>
                    <td>{order.service}</td>
                    <td>{order.duration}</td>
                    <td className="tabular">{formatIDR(order.amount)}</td>
                    <td>
                      <select
                        className="select"
                        aria-label={`Status untuk ${order.id}`}
                        style={{ minHeight: 32, padding: "4px 7px", fontSize: 9, width: 140 }}
                        value={current}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        disabled={!DEMO_MODE}
                      >
                        {statuses.slice(1).map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </td>
                    <td>{formatDateID(order.date)}</td>
                    <td><StatusBadge status={order.due === "—" ? "Menunggu" : order.due} /></td>
                    <td>
                      <Link className="table-action" href={`/orders/${order.id}`} aria-label={`Lihat ${order.id}`}>
                        <Eye size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}