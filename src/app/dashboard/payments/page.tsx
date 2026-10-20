"use client";

import { Download, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { payments as seedPayments, formatIDR } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiOrderPayment } from "@/lib/admin-mappers";
import { downloadCsv } from "@/lib/csv";
import type { Payment } from "@/lib/types";

const STATUS_FILTERS = ["Semua", "Berhasil", "Menunggu", "Dikembalikan", "Kedaluwarsa", "Gagal"] as const;

export default function PaymentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("Semua");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiPayments, setApiPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      const response = await adminApi.listPayments({ page: 1, per_page: 50 });
      if (!Array.isArray(response.payments)) {
        setError("Respons pembayaran dari server tidak sesuai kontrak");
        return;
      }

      // Endpoint mengirim pesanan beserta payments; ratakan ke baris payment
      // tanpa mengarang metode atau nominal.
      setApiPayments(
        response.payments.flatMap((order) =>
          (order.payments ?? []).map((payment) => mapApiOrderPayment(order, payment)),
        ),
      );
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
        description="Rekonsiliasi pembayaran pelanggan terhadap pesanan akun langganan sharing agar aktivasi slot anggota bisa dilanjutkan."
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
          change={`${metrics.settledCount} pembayaran berhasil`}
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
          change={`${metrics.settledCount} dari ${metrics.totalCount} pembayaran`}
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
        <select
          className="select"
          style={{ width: 150 }}
          value={status}
          onChange={(event) => setStatus(event.target.value as (typeof STATUS_FILTERS)[number])}
        >
          {STATUS_FILTERS.map((value) => <option key={value}>{value}</option>)}
        </select>
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} pembayaran</span>
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
    </div>
  );
}
