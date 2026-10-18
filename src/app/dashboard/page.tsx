"use client";

import { ArrowRight, Banknote, Boxes, CircleCheckBig, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RevenueChart } from "@/components/dashboard-charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatIDR } from "@/lib/money";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiDashboard, mapApiOrderToDashboardOrder } from "@/lib/admin-mappers";
import type { DashboardOrder } from "@/lib/types";

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<DashboardError | null>(null);

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

  const emptyData: DashboardData = {
    grossRevenue: 0,
    newOrders: 0,
    activeActivations: 0,
    availableSlots: 0,
  };

  // Data simulasi hanya dipakai saat mode demo aktif.
  const demoData: DashboardData = {
    grossRevenue: 83_600_000,
    newOrders: 83,
    activeActivations: 17,
    availableSlots: 38,
  };

  const demoOrders: DashboardOrder[] = [
    { id: "NCL-260906-091", customer: "Nabila Rahma", customerEmail: "nabila@example.id", product: "StreamFlix Family Slot", service: "StreamFlix Family Slot", duration: "3 bulan", amount: 109_000, status: "Diproses", date: "06 Sep 2026", due: "06 Sep · 10:20" },
    { id: "NCL-260906-090", customer: "Rafi Akbar", customerEmail: "rafi@example.id", product: "CineMax Family Member", service: "CineMax Family Member", duration: "1 bulan", amount: 32_000, status: "Dibayar", date: "06 Sep 2026", due: "06 Sep · 10:35" },
    { id: "NCL-260905-089", customer: "Andra Kurnia", customerEmail: "andra@example.id", product: "OfficeCloud Family Seat", service: "OfficeCloud Family Seat", duration: "12 bulan", amount: 499_000, status: "Aktif", date: "05 Sep 2026", due: "05 Sep · 16:08" },
    { id: "NCL-260905-088", customer: "Tio Hadi", customerEmail: "tio@example.id", product: "AI Studio Team Seat", service: "AI Studio Team Seat", duration: "1 bulan", amount: 79_000, status: "Menunggu pembayaran", date: "05 Sep 2026", due: "—" },
    { id: "NCL-260904-087", customer: "Dewi Sari", customerEmail: "dewi@example.id", product: "LearnLab Plus Member", service: "LearnLab Plus Member", duration: "6 bulan", amount: 185_000, status: "Aktif", date: "04 Sep 2026", due: "04 Sep · 14:21" },
  ];

  const displayData = DEMO_MODE ? demoData : data ?? emptyData;
  const displayOrders = DEMO_MODE ? demoOrders : recentOrders;
  const revenueInJuta = displayData.grossRevenue / 1_000_000;
  // Belum ada field perbandingan di kontrak C-06; teks persentase lama tidak
  // boleh ditampilkan seolah-olah berasal dari data.
  const comparisonText = DEMO_MODE ? "Data simulasi" : "—";

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Ringkasan operasional"
        description="Pantau penjualan akun langganan sharing, pembayaran, aktivasi slot anggota, dan ketersediaan agar pelanggan berlangganan lebih hemat."
        actions={
          <>
            <button className="button button-secondary button-sm" type="button">
              {DEMO_MODE ? "31 Agu–6 Sep (simulasi)" : "Pilih rentang waktu"}
            </button>
            <Link className="button button-primary button-sm" href="/dashboard/orders">
              Buka pesanan <ArrowRight size={13} />
            </Link>
          </>
        }
      />
      <section className="metric-grid" aria-label="Metrik kunci">
        <MetricCard
          label="Pendapatan kotor"
          value={DEMO_MODE ? `Rp${revenueInJuta.toLocaleString("id-ID", { minimumFractionDigits: 1 })} jt` : formatIDR(displayData.grossRevenue)}
          change={comparisonText}
          icon={<Banknote size={14} />}
        />
        <MetricCard
          label="Pesanan baru"
          value={String(displayData.newOrders)}
          change={comparisonText}
          icon={<ShoppingCart size={14} />}
        />
        <MetricCard
          label="Aktivasi berjalan"
          value={String(displayData.activeActivations)}
          change={comparisonText}
          icon={<CircleCheckBig size={14} />}
        />
        <MetricCard
          label="Slot tersedia"
          value={String(displayData.availableSlots)}
          change={comparisonText}
          icon={<Boxes size={14} />}
        />
      </section>
      <section className="dashboard-grid">
        <article className="card panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Gerakan pendapatan</h2>
              <span className="muted" style={{ fontSize: 9 }}>
                IDR juta · 7 hari terakhir
              </span>
            </div>
            <span className="badge status-info">Harian</span>
          </div>
          {DEMO_MODE ? (
            <RevenueChart />
          ) : (
            <p className="muted small" style={{ margin: 0, padding: "16px 0" }} role="status">
              Deret pendapatan harian belum tersedia dari API. Angka metrik di atas berasal dari ringkasan server.
            </p>
          )}
        </article>
        <article className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">Aktivitas langsung</h2>
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
