"use client";

import { Download, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SearchableSelect } from "@/components/searchable-select";
import { StatusBadge } from "@/components/status-badge";
import { payments as seedPayments, formatIDR } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE, type ApiOrder } from "@/lib/api";
import { mapApiOrderPayment } from "@/lib/admin-mappers";
import { downloadCsv } from "@/lib/csv";
import type { Payment } from "@/lib/types";

const STATUS_FILTERS = ["Semua", "Berhasil", "Menunggu", "Dikembalikan", "Kedaluwarsa", "Gagal"] as const;
const PAYMENT_PAGE_SIZE = 100;

function flattenPayments(orders: ApiOrder[]): Payment[] {
  return orders.flatMap((order) =>
    (order.payments ?? []).map((payment) => mapApiOrderPayment(order, payment)),
  );
}

export default function PaymentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("Semua");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiPayments, setApiPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadedOrders, setLoadedOrders] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await bootstrapAuth();
      if (!user) {
        setError("Sesi tidak valid. Silakan masuk kembali.");
        return;
      }
      if (user.role !== "admin") {
        setError("Akses ditolak: hanya admin yang dapat mengelola pembayaran");
        return;
      }

      const response = await adminApi.listPayments({ page: 1, per_page: PAYMENT_PAGE_SIZE });
      if (!Array.isArray(response.payments)) {
        setError("Respons pembayaran dari server tidak sesuai kontrak");
        return;
      }

      // Endpoint mengirim pesanan beserta payments; ratakan ke baris payment
      // tanpa mengarang metode atau nominal.
      setApiPayments(flattenPayments(response.payments));
      setPage(typeof response.page === "number" ? response.page : 1);
      setLoadedOrders(response.payments.length);
      setTotalOrders(typeof response.total === "number" ? response.total : response.payments.length);
    } catch {
      setError("Gagal memuat pembayaran dari server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    void Promise.resolve().then(() => loadPayments());
  }, [loadPayments]);

  const loadMorePayments = useCallback(async () => {
    if (DEMO_MODE || loadingMore || loadedOrders >= totalOrders) return;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const response = await adminApi.listPayments({ page: page + 1, per_page: PAYMENT_PAGE_SIZE });
      if (!Array.isArray(response.payments)) {
        setLoadMoreError("Respons pembayaran berikutnya tidak sesuai kontrak.");
        return;
      }
      const next = flattenPayments(response.payments);
      setApiPayments((current) => {
        const seen = new Set((current ?? []).map((payment) => payment.id));
        return [...(current ?? []), ...next.filter((payment) => !seen.has(payment.id))];
      });
      setPage(typeof response.page === "number" ? response.page : page + 1);
      setLoadedOrders((current) => current + response.payments.length);
      setTotalOrders(typeof response.total === "number" ? response.total : totalOrders);
    } catch {
      setLoadMoreError("Gagal memuat pesanan pembayaran berikutnya.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadedOrders, loadingMore, page, totalOrders]);

  const sourcePayments = useMemo(() => (DEMO_MODE ? seedPayments : apiPayments ?? []), [apiPayments]);

  const rows = useMemo(
    () =>
      sourcePayments.filter(
        (payment) =>
          (status === "Semua" || payment.status === status) &&
          (payment.id + payment.orderId + payment.customer)
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, status, sourcePayments],
  );

  const metrics = useMemo(() => {
    const successful = sourcePayments.filter((payment) => payment.status === "Berhasil");
    const pending = sourcePayments.filter((payment) => payment.status === "Menunggu");
    const refunded = sourcePayments.filter((payment) => payment.status === "Dikembalikan");
    const sum = (items: Payment[]) => items.reduce((total, payment) => total + payment.amount, 0);
    return {
      settled: sum(successful),
      pending: sum(pending),
      refunded: sum(refunded),
      settledCount: successful.length,
      totalCount: sourcePayments.length,
    };
  }, [sourcePayments]);

  const exportRows = () => {
    downloadCsv(
      `necly-pembayaran-${new Date().toISOString().slice(0, 10)}.csv`,
      ["ID", "Pesanan", "Pelanggan", "Metode", "Jumlah", "Status", "Waktu"],
      rows.map((payment) => [
        payment.id,
        payment.orderId,
        payment.customer,
        payment.method,
        payment.amount,
        payment.status,
        payment.date,
      ]),
    );
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }} role="alert">
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat pembayaran</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            {error}
          </p>
          <button className="button button-primary button-sm" onClick={() => void loadPayments()} style={{ minWidth: 160 }}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Pembayaran akun sharing"
        description="Rekonsiliasi pembayaran pelanggan terhadap pesanan akun langganan sharing agar aktivasi akses anggota bisa dilanjutkan."
        actions={
          <button className="button button-secondary button-sm" onClick={exportRows} disabled={rows.length === 0}>
            <Download size={13} /> Ekspor buku besar
          </button>
        }
      />
      {DEMO_MODE && (
        <div className="demo-banner">
          <span><strong>Data keuangan sandbox.</strong> Nilai di bawah adalah contoh; tidak ada prosesor, bank, atau dompet yang terhubung.</span>
        </div>
      )}
      <section className="metric-grid">
        <MetricCard
          label="Volume berhasil"
          value={formatIDR(metrics.settled)}
          change={`${metrics.settledCount} pembayaran berhasil (pesanan termuat)`}
        />
        <MetricCard
          label="Menunggu"
          value={formatIDR(metrics.pending)}
          change="Belum diselesaikan pembeli"
        />
        <MetricCard
          label="Dikembalikan"
          value={formatIDR(metrics.refunded)}
          change="Pembayaran yang dikembalikan"
        />
        <MetricCard
          label="Tingkat settlement"
          value={metrics.totalCount === 0 ? "—" : `${Math.round((metrics.settledCount / metrics.totalCount) * 100)}%`}
          change={`${metrics.settledCount} dari ${metrics.totalCount} pembayaran pada pesanan termuat`}
        />
      </section>
      <div className="toolbar">
        <div className="input-wrap">
          <Search size={14} />
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari pembayaran, pesanan, atau pelanggan…"
          />
        </div>
        <SearchableSelect
          className="toolbar-select"
          ariaLabel="Filter status pembayaran"
          options={STATUS_FILTERS.map((value) => ({ value, label: value }))}
          value={status}
          onChange={(value) => setStatus(value as (typeof STATUS_FILTERS)[number])}
        />
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} pembayaran</span>
        {!DEMO_MODE && totalOrders > 0 && (
          <span className="muted" style={{ fontSize: 9 }}>
            {loadedOrders} dari {totalOrders} pesanan dimuat
          </span>
        )}
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pembayaran</th>
                <th>Pesanan</th>
                <th>Pelanggan</th>
                <th>Metode</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={7} className="muted" style={{ textAlign: "center" }}>Belum ada pembayaran.</td></tr>
              ) : rows.map((payment) => (
                <tr key={payment.id}>
                  <td className="table-primary">{payment.id}</td>
                  <td>{payment.orderId}</td>
                  <td>{payment.customer}</td>
                  <td>{payment.method}</td>
                  <td className="tabular">{formatIDR(payment.amount)}</td>
                  <td><StatusBadge status={payment.status} /></td>
                  <td>{payment.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {loadMoreError && <div className="notice" role="alert" style={{ color: "var(--danger)" }}>{loadMoreError}</div>}
      {!DEMO_MODE && loadedOrders < totalOrders && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <button className="button button-secondary button-sm" type="button" onClick={() => void loadMorePayments()} disabled={loadingMore}>
            {loadingMore ? "Memuat…" : "Muat lebih banyak pesanan"}
          </button>
        </div>
      )}
    </div>
  );
}
