"use client";

import { Download, Eye, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { dashboardOrders } from "@/data/seed";
import { formatIDR, formatDateID } from "@/lib/money";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiOrderToDashboardOrder } from "@/lib/admin-mappers";
import { downloadCsv } from "@/lib/csv";
import type { DashboardOrder } from "@/lib/types";
import { ORDER_STATUS_OPTIONS } from "@/lib/order-status";

const statuses = ["Semua", ...ORDER_STATUS_OPTIONS] as const;
type StatusType = (typeof statuses)[number];

export default function OrdersAdminPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusType>("Semua");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [apiOrders, setApiOrders] = useState<DashboardOrder[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    let cancelled = false;

    async function loadOrders() {
      try {
        const user = await bootstrapAuth();
        if (cancelled) return;
        if (!user) {
          setError("Sesi tidak valid. Silakan masuk kembali.");
          return;
        }
        if (user.role !== "admin") {
          // Penjual tidak boleh memicu request data pesanan admin.
          setError("Akses ditolak: hanya admin yang dapat mengelola pesanan");
          return;
        }

        const response = await adminApi.listOrders({ page: 1, per_page: 50 });
        if (!Array.isArray(response.orders)) {
          setError("Respons pesanan dari server tidak sesuai kontrak");
          return;
        }
        setApiOrders(response.orders.map(mapApiOrderToDashboardOrder));
        setPage(typeof response.page === "number" ? response.page : 1);
        setTotal(typeof response.total === "number" ? response.total : response.orders.length);
      } catch {
        if (!cancelled) setError("Gagal memuat pesanan dari server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  const sourceOrders = useMemo(() => DEMO_MODE ? dashboardOrders : apiOrders ?? [], [apiOrders]);

  const rows = useMemo(
    () =>
      sourceOrders.filter((order: DashboardOrder) => {
        return (status === "Semua" || order.status === status) &&
          (order.id + order.customer + order.service).toLowerCase().includes(query.toLowerCase());
      }),
    [query, status, sourceOrders],
  );

  const loadMore = useCallback(async () => {
    if (DEMO_MODE || loadingMore || sourceOrders.length >= total) return;
    setLoadingMore(true);
    try {
      const response = await adminApi.listOrders({ page: page + 1, per_page: 50 });
      if (!Array.isArray(response.orders)) {
        setError("Respons pesanan dari server tidak sesuai kontrak");
        return;
      }
      const next = response.orders.map(mapApiOrderToDashboardOrder);
      setApiOrders((current) => {
        const seen = new Set((current ?? []).map((order) => order.id));
        return [...(current ?? []), ...next.filter((order) => !seen.has(order.id))];
      });
      setPage(typeof response.page === "number" ? response.page : page + 1);
      setTotal(typeof response.total === "number" ? response.total : total);
    } catch {
      setError("Gagal memuat pesanan berikutnya dari server");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, sourceOrders.length, total]);

  const exportRows = () => {
    downloadCsv(
      `necly-pesanan-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Pesanan", "Pelanggan", "Email", "Produk", "Durasi", "Jumlah", "Status", "Dibuat", "Jatuh tempo"],
      rows.map((order) => [
        order.id,
        order.customer,
        order.customerEmail,
        order.service,
        order.duration,
        order.amount,
        order.status,
        order.date,
        order.due,
      ]),
    );
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
        description="Kelola pesanan akun langganan sharing, terima pembayaran, dan koordinasikan aktivasi akses anggota ke pelanggan."
        actions={<button className="button button-secondary button-sm" onClick={exportRows} disabled={rows.length === 0}><Download size={13} /> Ekspor pesanan</button>}
      />
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari pesanan, pelanggan, atau produk…" /></div>
        <select className="select" style={{ width: 170 }} value={status} onChange={(e) => setStatus(e.target.value as StatusType)}>
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} pesanan</span>
        {!DEMO_MODE && sourceOrders.length > 0 && (
          <span className="muted" style={{ fontSize: 9 }}>
            {sourceOrders.length} dari {total} dimuat
          </span>
        )}
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
                      <StatusBadge status={order.status} />
                    </td>
                    <td>{formatDateID(order.date)}</td>
                    <td>{order.due}</td>
                    <td>
                      <Link className="table-action" href={`/dashboard/orders/${encodeURIComponent(order.apiId ?? order.id)}`} aria-label={`Lihat ${order.id}`}>
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
      {!DEMO_MODE && sourceOrders.length < total && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <button className="button button-secondary button-sm" type="button" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? "Memuat…" : "Muat lebih banyak pesanan"}
          </button>
        </div>
      )}
    </div>
  );
}
