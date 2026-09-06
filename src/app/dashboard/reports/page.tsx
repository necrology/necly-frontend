"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoryChart, OrdersChart } from "@/components/dashboard-charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { categoryPerformance } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";

export default function ReportsPage() {
  const categoriesPerformanceData = DEMO_MODE ? categoryPerformance : [];
  const [period, setPeriod] = useState("7 hari terakhir");
  const [metric, setMetric] = useState("Pendapatan");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      bootstrapAuth().then((user) => {
        if (user?.role === "admin") {
          // No backend endpoint for admin reports yet
          setError("Endpoint laporan admin belum tersedia di backend");
          setLoading(false);
        } else {
          setError("Akses ditolak: hanya admin yang dapat melihat laporan");
          setLoading(false);
        }
      });
    }
  }, []);

  const unavailable = (action: string) => {
    setNotice(`${action} belum tersedia. Hubungkan ke API admin untuk mengaktifkan.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat laporan</h2>
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
        title="Laporan"
        description="Bandingkan permintaan, pendapatan, dan kinerja kategori."
        actions={<button className="button button-primary button-sm" onClick={() => unavailable("Ekspor laporan")}><Download size={13} /> Ekspor laporan</button>}
      />
      {notice && <div className="notice success" role="status">{notice}</div>}
      <div className="toolbar">
        <select className="select" style={{ width: 170 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option>7 hari terakhir</option>
          <option>30 hari terakhir</option>
          <option>Kuartal ini</option>
        </select>
        <select className="select" style={{ width: 150 }} value={metric} onChange={(e) => setMetric(e.target.value)}>
          <option>Pendapatan</option>
          <option>Pesanan</option>
          <option>Konversi</option>
        </select>
        <span className="muted" style={{ fontSize: 9 }}>Melihat {metric.toLowerCase()} · {period.toLowerCase()}</span>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="metric-grid">
        <MetricCard label="Pendapatan laporan" value={DEMO_MODE ? "Rp83,6jt" : "Rp0"} change={DEMO_MODE ? "↑ 12,4% vs periode sebelumnya" : "Menunggu data"} />
        <MetricCard label="Pesanan" value={DEMO_MODE ? "83" : "0"} change={DEMO_MODE ? "↑ 10,7% vs periode sebelumnya" : "Menunggu data"} />
        <MetricCard label="Konversi" value={DEMO_MODE ? "6,5%" : "0%"} change={DEMO_MODE ? "↑ 0,6 poin persen" : "Menunggu data"} />
        <MetricCard label="Rata-rata pesanan" value={DEMO_MODE ? "Rp1,01jt" : "Rp0"} change={DEMO_MODE ? "↑ 1,8% vs periode sebelumnya" : "Menunggu data"} />
      </section>
      <section className="dashboard-grid">
        <article className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">Pesanan per hari</h2>
            <span className="badge status-info">{period}</span>
          </div>
          <OrdersChart />
        </article>
        <article className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">Pendapatan per kategori</h2>
          </div>
          <CategoryChart />
        </article>
      </section>
      <section className="card table-panel">
        <div className="panel-header" style={{ padding: "16px 18px 0" }}>
          <h2 className="panel-title">Kinerja kategori</h2>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Pendapatan</th>
                <th>Pesanan</th>
                <th>Konversi</th>
                <th>Bagian pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {categoriesPerformanceData.length === 0 && !loading ? (
                <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Belum ada data laporan.</td></tr>
              ) : categoriesPerformanceData.map((c) => (
                <tr key={c.category}>
                  <td className="table-primary">{c.category}</td>
                  <td>Rp{c.revenue}jt</td>
                  <td>{c.orders}</td>
                  <td>{c.conversion}%</td>
                  <td>
                    <div className="inventory-bar"><span style={{ width: `${c.revenue / 24.8 * 100}%` }} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}