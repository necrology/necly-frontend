"use client";

import { ArrowRight, Banknote, Boxes, CircleCheckBig, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CategoryRevenueBarChart,
  OrderStatusDonutChart,
  OrdersSeriesChart,
  RevenueTrendChart,
  TopProductsBreakdown,
} from "@/components/dashboard-charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatIDR } from "@/lib/money";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiDashboard, mapApiDashboardAnalytics, mapApiOrderToDashboardOrder } from "@/lib/admin-mappers";
import type { AnalyticsRangeDays, DashboardAnalytics, DashboardOrder } from "@/lib/types";

interface DashboardData {
  grossRevenue: number;
  newOrders: number;
  activeActivations: number;
  availableSlots: number;
}

type DashboardError = {
  kind: "forbidden" | "unauthorized" | "generic";
  message: string;
};

const PERIOD_OPTIONS: AnalyticsRangeDays[] = [7, 30, 90];

/** Data simulasi hanya untuk mode demo; jalur live tidak pernah memakai ini. */
function createDemoAnalytics(days: AnalyticsRangeDays): DashboardAnalytics {
  const end = new Date("2026-09-06T00:00:00Z");
  const revenuePattern = [1.2, 1.8, 1.4, 2.2, 1.9, 2.6, 2.1];
  const orderPattern = [18, 24, 21, 34, 29, 41, 36];
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - 1 - index));
    const slot = index % revenuePattern.length;
    return {
      date: date.toISOString().slice(0, 10),
      amount: Math.round(revenuePattern[slot] * 1_000_000),
      orders: orderPattern[slot],
    };
  });

  return {
    rangeDays: days,
    from: series[0]?.date ?? "2026-09-06",
    to: series[series.length - 1]?.date ?? "2026-09-06",
    revenueSeries: series.map(({ date, amount }) => ({ date, amount })),
    ordersSeries: series.map(({ date, orders }) => ({ date, orders })),
    statusBreakdown: [
      { status: "paid", count: 2 },
      { status: "pending_payment", count: 1 },
      { status: "completed", count: 1 },
    ],
    topProducts: [
      { productId: "demo-1", productName: "StreamFlix Keluarga", salesCount: 16, revenue: 1_744_000 },
      { productId: "demo-2", productName: "CineMax Anggota Keluarga", salesCount: 11, revenue: 352_000 },
      { productId: "demo-3", productName: "OfficeCloud Kursi Keluarga", salesCount: 7, revenue: 3_493_000 },
    ],
    categoryBreakdown: [
      { categoryId: "demo-streaming", categoryName: "Streaming", orders: 128, revenue: 5_800_000 },
      { categoryId: "demo-productivity", categoryName: "Produktivitas", orders: 42, revenue: 3_100_000 },
      { categoryId: "demo-creative", categoryName: "Kreatif", orders: 31, revenue: 1_700_000 },
      { categoryId: "demo-education", categoryName: "Edukasi", orders: 38, revenue: 1_500_000 },
      { categoryId: "demo-security", categoryName: "Keamanan", orders: 26, revenue: 1_100_000 },
    ],
  };
}

function formatRangeDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<DashboardError | null>(null);
  const [period, setPeriod] = useState<AnalyticsRangeDays>(7);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(!DEMO_MODE);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsReloadToken, setAnalyticsReloadToken] = useState(0);
  const [sessionReady, setSessionReady] = useState(DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      setRecentError(null);

      try {
        const user = await bootstrapAuth();
        if (cancelled) return;
        if (!user) {
          setError({
            kind: "unauthorized",
            message: "Sesi tidak valid. Silakan masuk kembali.",
          });
          return;
        }

        // Backend C19 hanya mengizinkan admin. Penjual tidak boleh memicu
        // permintaan data admin sama sekali, bukan sekadar melihat nol.
        if (user.role !== "admin") {
          setError({
            kind: "forbidden",
            message: "Akses ditolak: halaman dashboard hanya untuk admin.",
          });
          return;
        }

        // Analitik boleh dimuat paralel dengan metrik setelah role terverifikasi.
        setSessionReady(true);

        const [statsResult, ordersResult] = await Promise.allSettled([
          adminApi.dashboard(),
          // Baris terbaru berasal dari daftar pesanan, bukan metrik rekaan pada
          // respons dashboard (W0 C-06).
          adminApi.listOrders({ page: 1, per_page: 5 }),
        ]);

        if (cancelled) return;

        if (statsResult.status === "fulfilled") {
          try {
            setData(mapApiDashboard(statsResult.value as unknown as Record<string, unknown>));
          } catch {
            setError({
              kind: "generic",
              message: "Data metrik dashboard dari server tidak lengkap. Muat ulang untuk mencoba lagi.",
            });
          }
        } else {
          setError({
            kind: "generic",
            message: "Gagal memuat ringkasan dashboard dari server.",
          });
        }

        if (ordersResult.status === "fulfilled") {
          const orders = ordersResult.value.orders;
          if (!Array.isArray(orders)) {
            setRecentError("Data pesanan terbaru dari server tidak sesuai kontrak.");
          } else {
            setRecentOrders(orders.map(mapApiOrderToDashboardOrder).slice(0, 5));
          }
        } else {
          setRecentError("Gagal memuat pesanan terbaru dari server.");
        }
      } catch {
        if (!cancelled) {
          setError({
            kind: "generic",
            message: "Gagal memuat ringkasan dashboard dari server.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (DEMO_MODE || !sessionReady) return;

    let cancelled = false;

    adminApi
      .dashboardAnalytics({ days: period })
      .then((response) => {
        if (cancelled) return;
        try {
          setAnalytics(mapApiDashboardAnalytics(response));
        } catch {
          setAnalyticsError("Data analitik dashboard dari server tidak lengkap atau tidak sesuai kontrak.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnalyticsError("Gagal memuat analitik dashboard dari server.");
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, sessionReady, analyticsReloadToken]);

  const changePeriod = (days: AnalyticsRangeDays) => {
    if (days === period) return;
    setPeriod(days);
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    // Jangan mempertahankan chart periode lama saat periode baru sedang dimuat.
    setAnalytics(null);
  };

  const retryAnalytics = () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    setAnalytics(null);
    setAnalyticsReloadToken((value) => value + 1);
  };

  if (error && !DEMO_MODE) {
    const title =
      error.kind === "forbidden"
        ? "Akses ditolak"
        : error.kind === "unauthorized"
          ? "Sesi tidak valid"
          : "Tidak dapat memuat dashboard";

    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            {error.message}
          </p>
          {error.kind === "forbidden" ? (
            <Link className="button button-primary button-sm" href="/" style={{ minWidth: 160 }}>
              Kembali ke marketplace
            </Link>
          ) : (
            <button
              className="button button-primary button-sm"
              onClick={() => window.location.reload()}
              style={{ minWidth: 160 }}
            >
              Coba lagi
            </button>
          )}
        </div>
      </div>
    );
  }

  // Data simulasi hanya dipakai saat mode demo aktif.
  const demoData: DashboardData = {
    grossRevenue: 83_600_000,
    newOrders: 83,
    activeActivations: 17,
    availableSlots: 38,
  };

  const demoOrders: DashboardOrder[] = [
    { id: "NCL-260906-091", customer: "Nabila Rahma", customerEmail: "nabila@example.id", product: "StreamFlix Keluarga", service: "StreamFlix Keluarga", duration: "3 bulan", amount: 109_000, status: "Diproses", date: "06 Sep 2026", due: "06 Sep · 10:20" },
    { id: "NCL-260906-090", customer: "Rafi Akbar", customerEmail: "rafi@example.id", product: "CineMax Anggota Keluarga", service: "CineMax Anggota Keluarga", duration: "1 bulan", amount: 32_000, status: "Dibayar", date: "06 Sep 2026", due: "06 Sep · 10:35" },
    { id: "NCL-260905-089", customer: "Andra Kurnia", customerEmail: "andra@example.id", product: "OfficeCloud Kursi Keluarga", service: "OfficeCloud Kursi Keluarga", duration: "12 bulan", amount: 499_000, status: "Aktif", date: "05 Sep 2026", due: "05 Sep · 16:08" },
    { id: "NCL-260905-088", customer: "Tio Hadi", customerEmail: "tio@example.id", product: "AI Studio Team Seat", service: "AI Studio Team Seat", duration: "1 bulan", amount: 79_000, status: "Menunggu pembayaran", date: "05 Sep 2026", due: "—" },
    { id: "NCL-260904-087", customer: "Dewi Sari", customerEmail: "dewi@example.id", product: "LearnLab Plus Member", service: "LearnLab Plus Member", duration: "6 bulan", amount: 185_000, status: "Aktif", date: "04 Sep 2026", due: "04 Sep · 14:21" },
  ];

  // Saat live dan statistik belum tiba, jangan merender nol. Nilai yang belum
  // tersedia ditampilkan sebagai "—" sampai respons server benar-benar ada.
  const displayData = DEMO_MODE ? demoData : data;
  const displayOrders = DEMO_MODE ? demoOrders : recentOrders;
  const displayAnalytics = DEMO_MODE ? createDemoAnalytics(period) : analytics;
  const metricsReady = displayData !== null;
  const revenueLabel = displayData
    ? DEMO_MODE
      ? `Rp${(displayData.grossRevenue / 1_000_000).toLocaleString("id-ID", { minimumFractionDigits: 1 })} jt`
      : formatIDR(displayData.grossRevenue)
    : "—";
  // Belum ada field perbandingan di kontrak C-06; teks persentase lama tidak
  // boleh ditampilkan seolah-olah berasal dari data.
  const comparisonText = metricsReady ? (DEMO_MODE ? "Data simulasi" : "—") : "Memuat metrik…";
  const rangeLabel = displayAnalytics
    ? `${formatRangeDate(displayAnalytics.from)}–${formatRangeDate(displayAnalytics.to)}`
    : `${period} hari terakhir`;

  const analyticsPanel = () => {
    if (analyticsLoading) {
      return (
        <section className="card panel" role="status" aria-live="polite">
          <h2 className="panel-title">Ringkasan analitik</h2>
          <p className="muted small" style={{ margin: "12px 0 0" }}>Memuat analitik dashboard…</p>
        </section>
      );
    }

    if (analyticsError) {
      return (
        <section className="card panel" role="alert">
          <div className="panel-header" style={{ marginBottom: 8 }}>
            <div>
              <h2 className="panel-title">Ringkasan analitik</h2>
              <span className="muted" style={{ fontSize: 9 }}>{period} hari terakhir</span>
            </div>
          </div>
          <p className="muted small" style={{ margin: "0 0 12px" }}>{analyticsError}</p>
          <button
            className="button button-secondary button-sm"
            type="button"
            onClick={retryAnalytics}
          >
            Coba lagi
          </button>
        </section>
      );
    }

    if (!displayAnalytics) return null;

    return (
      <div className="analytics-grid" aria-label="Chart analitik dashboard">
        <article className="card panel analytics-wide">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Tren pendapatan harian</h2>
              <span className="muted" style={{ fontSize: 9 }}>{rangeLabel} · total {formatIDR(displayAnalytics.revenueSeries.reduce((sum, point) => sum + point.amount, 0))}</span>
            </div>
            <span className="badge status-info">Area</span>
          </div>
          <RevenueTrendChart data={displayAnalytics.revenueSeries} />
        </article>

        <article className="card panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Pesanan per hari</h2>
              <span className="muted" style={{ fontSize: 9 }}>{rangeLabel}</span>
            </div>
            <span className="badge status-info">Bar</span>
          </div>
          <OrdersSeriesChart data={displayAnalytics.ordersSeries} />
        </article>

        <article className="card panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Komposisi status pesanan</h2>
              <span className="muted" style={{ fontSize: 9 }}>{rangeLabel}</span>
            </div>
            <span className="badge status-info">Donut</span>
          </div>
          <OrderStatusDonutChart data={displayAnalytics.statusBreakdown} />
        </article>

        <article className="card panel analytics-wide">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Pendapatan per kategori</h2>
              <span className="muted" style={{ fontSize: 9 }}>{rangeLabel}</span>
            </div>
            <span className="badge status-info">Bar horizontal</span>
          </div>
          <CategoryRevenueBarChart data={displayAnalytics.categoryBreakdown} />
        </article>

        <article className="card panel analytics-wide">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Produk terlaris</h2>
              <span className="muted" style={{ fontSize: 9 }}>Berdasarkan jumlah penjualan pada periode terpilih</span>
            </div>
          </div>
          <TopProductsBreakdown data={displayAnalytics.topProducts} />
        </article>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Dashboard operasional"
        description="Pantau penjualan akun langganan sharing, pembayaran, aktivasi akses anggota, dan ketersediaan agar pelanggan berlangganan lebih hemat."
        actions={
          <>
            <span className="badge status-info">
              {DEMO_MODE ? `${period} hari (simulasi)` : rangeLabel}
            </span>
            <Link className="button button-primary button-sm" href="/dashboard/orders">
              Buka pesanan <ArrowRight size={13} />
            </Link>
          </>
        }
      />
      <section className="metric-grid" aria-label="Metrik kunci">
        <MetricCard
          label="Pendapatan kotor"
          value={revenueLabel}
          change={comparisonText}
          icon={<Banknote size={14} />}
        />
        <MetricCard
          label="Pesanan baru"
          value={displayData ? String(displayData.newOrders) : "—"}
          change={comparisonText}
          icon={<ShoppingCart size={14} />}
        />
        <MetricCard
          label="Aktivasi berjalan"
          value={displayData ? String(displayData.activeActivations) : "—"}
          change={comparisonText}
          icon={<CircleCheckBig size={14} />}
        />
        <MetricCard
          label="Akses tersedia"
          value={displayData ? String(displayData.availableSlots) : "—"}
          change={comparisonText}
          icon={<Boxes size={14} />}
        />
      </section>

      <section className="analytics-section" aria-label="Analitik dashboard">
        <div className="analytics-toolbar">
          <div>
            <h2 className="panel-title">Ringkasan analitik</h2>
            <span className="muted" style={{ fontSize: 9 }}>Filter periode untuk seluruh chart di bawah</span>
          </div>
          <div className="period-filter" role="group" aria-label="Filter periode analitik">
            {PERIOD_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={period === days}
                onClick={() => changePeriod(days)}
              >
                {days} hari
              </button>
            ))}
          </div>
        </div>
        {analyticsPanel()}
      </section>

      <section className="dashboard-grid">
        <article className="card panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Aktivitas langsung</h2>
              <span className="muted" style={{ fontSize: 9 }}>Pesanan terbaru dari server</span>
            </div>
            <Link href="/dashboard/audit-log" className="muted" style={{ fontSize: 9 }}>
              Log audit
            </Link>
          </div>
          <div className="activity-list">
            {recentError && <p className="muted small" role="alert" style={{ margin: 0 }}>{recentError}</p>}
            {!recentError && displayOrders.length === 0 && !loading && (
              <p className="muted small" style={{ margin: 0 }}>Belum ada pesanan.</p>
            )}
            {!recentError && displayOrders.slice(0, 4).map((order) => (
              <div className="activity-row" key={order.id}>
                <span className="activity-dot" />
                <span>
                  <strong style={{ display: "block", fontSize: 10 }}>{order.id} — {order.customer}</strong>
                  <span className="muted" style={{ fontSize: 9 }}>
                    {order.service} · {formatIDR(order.amount)}
                  </span>
                </span>
                <time className="muted">{order.due}</time>
              </div>
            ))}
          </div>
        </article>
        <article className="card panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Ringkasan periode</h2>
              <span className="muted" style={{ fontSize: 9 }}>{rangeLabel}</span>
            </div>
          </div>
          <dl className="period-summary">
            <div><dt>Pendapatan</dt><dd>{displayAnalytics ? formatIDR(displayAnalytics.revenueSeries.reduce((sum, point) => sum + point.amount, 0)) : "—"}</dd></div>
            <div><dt>Pesanan</dt><dd>{displayAnalytics ? displayAnalytics.ordersSeries.reduce((sum, point) => sum + point.orders, 0) : "—"}</dd></div>
            <div><dt>Kategori terjual</dt><dd>{displayAnalytics ? displayAnalytics.categoryBreakdown.length : "—"}</dd></div>
            <div><dt>Produk teratas</dt><dd>{displayAnalytics?.topProducts[0]?.productName ?? "—"}</dd></div>
          </dl>
        </article>
      </section>
      <section className="card table-panel">
        <div className="panel-header" style={{ padding: "16px 18px 0" }}>
          <div>
            <h2 className="panel-title">Pesanan terbaru</h2>
            <span className="muted" style={{ fontSize: 9 }}>
              Aktivitas marketplace terbaru
            </span>
          </div>
          <Link className="button button-secondary button-sm" href="/dashboard/orders">
            Lihat semua
          </Link>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pesanan</th>
                <th>Pelanggan</th>
                <th>Produk</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Jatuh tempo</th>
              </tr>
            </thead>
            <tbody>
              {recentError && !DEMO_MODE ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center" }} role="alert">{recentError}</td>
                </tr>
              ) : displayOrders.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center" }}>Belum ada pesanan.</td>
                </tr>
              ) : displayOrders.slice(0, 5).map((order) => (
                <tr key={order.id}>
                  <td className="table-primary">
                    <Link href={`/dashboard/orders/${encodeURIComponent(order.apiId ?? order.id)}`}>{order.id}</Link>
                  </td>
                  <td>
                    <span className="table-primary">{order.customer}</span>
                    <br />
                    <span className="table-secondary">{order.customerEmail}</span>
                  </td>
                  <td>{order.service}</td>
                  <td className="tabular">{formatIDR(order.amount)}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>{order.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
