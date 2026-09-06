"use client";

import { AlertCircle, Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { payments, formatIDR } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { formatDateID } from "@/lib/money";

export default function PaymentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Semua");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiPayments, setApiPayments] = useState<typeof payments | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      bootstrapAuth().then((user) => {
        if (user?.role === "admin") {
          // No backend endpoint for admin payments yet
          setError("Endpoint pembayaran admin belum tersedia di backend");
          setLoading(false);
        } else {
          setError("Akses ditolak: hanya admin yang dapat mengelola pembayaran");
          setLoading(false);
        }
      });
    }
  }, []);

  const sourcePayments = DEMO_MODE ? payments : apiPayments ?? [];

  const rows = useMemo(
    () =>
      sourcePayments.filter(
        (p) => (status === "Semua" || p.status === status) && (p.id + p.orderId + p.customer).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, status, sourcePayments],
  );

  const unavailable = (action: string) => {
    setNotice(`${action} belum tersedia. Hubungkan ke API admin untuk mengaktifkan.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat pembayaran</h2>
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
        title="Pembayaran akun sharing"
        description="Rekonsiliasi pembayaran pelanggan terhadap pesanan akun langganan sharing agar aktivasi slot anggota bisa dilanjutkan."
        actions={<button className="button button-secondary button-sm" onClick={() => unavailable("Ekspor buku besar")}><Download size={13} /> Ekspor buku besar</button>}
      />
      <div className="demo-banner"><AlertCircle size={15} /><span><strong>Data keuangan sandbox.</strong> Nilai di bawah adalah contoh bernilai; tidak ada prosesor, bank, atau dompet yang terhubung.</span></div>
      <section className="metric-grid">
        <MetricCard label="Volume berhasil" value="Rp0" change="Belum ada settlement" />
        <MetricCard label="Menunggu" value="Rp0" change="Belum ada pembayaran menunggu" />
        <MetricCard label="Dikembalikan" value="Rp0" change="Belum ada pengembalian" />
        <MetricCard label="Tingkat settlement" value="0%" change="Belum ada data" />
      </section>
      {notice && <div className="notice success" role="status">{notice}</div>}
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari pembayaran, pesanan, atau pelanggan…" /></div>
        <select className="select" style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["Semua", "Berhasil", "Menunggu", "Dikembalikan"].map((v) => <option key={v}>{v}</option>)}
        </select>
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
              ) : rows.map((p) => (
                <tr key={p.id}>
                  <td className="table-primary">{p.id}</td>
                  <td>{p.orderId}</td>
                  <td>{p.customer}</td>
                  <td>{p.method}</td>
                  <td className="tabular">{formatIDR(p.amount)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{formatDateID(p.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}