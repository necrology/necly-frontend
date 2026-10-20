"use client";

import { Download, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { initialNotifications as seedNotifications, type NotificationItem } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { formatDateID } from "@/lib/money";

const typeLabels: Record<string, string> = {
  order: "Pesanan",
  inventory: "Inventaris",
  payment: "Pembayaran",
  system: "Sistem",
};

function notificationType(action: string): NotificationItem["type"] {
  if (action.startsWith("admin.order") || action.startsWith("order.")) return "order";
  if (action.includes("inventory") || action.includes("slot")) return "inventory";
  if (action.includes("payment") || action.includes("refund")) return "payment";
  return "system";
}

export default function NotificationsPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Semua");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiNotifications, setApiNotifications] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await bootstrapAuth();
      if (!user) {
        setError("Sesi tidak valid. Silakan masuk kembali.");
        return;
      }
      if (user.role !== "admin") {
        setError("Akses ditolak: hanya admin yang dapat melihat notifikasi");
        return;
      }

      const response = await adminApi.listNotifications({ page: 1, per_page: 50 });
      if (!Array.isArray(response.notifications)) {
        setError("Respons notifikasi dari server tidak sesuai kontrak");
        return;
      }

      // Backend memproyeksikan audit log sebagai notifikasi. Tidak ada status
      // baca di domain, jadi UI tidak mengarang tombol "tandai dibaca".
      setApiNotifications(
        response.notifications.map((log) => {
          const resource = log.resource_id ? `${log.resource_type} · ${log.resource_id}` : log.resource_type;
          return {
            id: log.id,
            title: log.action,
            detail: resource,
            type: notificationType(log.action),
            time: log.created_at,
            read: true,
          };
        }),
      );
    } catch {
      setError("Gagal memuat notifikasi dari server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    void Promise.resolve().then(() => loadNotifications());
  }, [loadNotifications]);

  const sourceNotifications = useMemo(
    () => (DEMO_MODE ? seedNotifications : apiNotifications ?? []),
    [apiNotifications],
  );
  const rows = useMemo(
    () =>
      sourceNotifications.filter(
        (notification) =>
          (type === "Semua" || notification.type === type) &&
          (notification.title + notification.detail).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, type, sourceNotifications],
  );

  const exportRows = () => {
    downloadCsv(
      `necly-notifikasi-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Jenis", "Aktivitas", "Sumber daya", "Waktu"],
      rows.map((notification) => [
        typeLabels[notification.type] ?? notification.type,
        notification.title,
        notification.detail,
        notification.time,
      ]),
    );
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }} role="alert">
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat notifikasi</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>{error}</p>
          <button className="button button-primary button-sm" onClick={() => void loadNotifications()} style={{ minWidth: 160 }}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Notifikasi"
        description="Pantau aktivitas operasional dari audit log. Status baca belum didukung API."
        actions={
          <button className="button button-secondary button-sm" onClick={exportRows} disabled={rows.length === 0}>
            <Download size={13} /> Ekspor
          </button>
        }
      />
      {!DEMO_MODE && (
        <div className="notice" role="status">
          Notifikasi ditampilkan dari audit log server. Tidak ada status baca atau aksi hapus di backend.
        </div>
      )}
      <div className="toolbar">
        <div className="input-wrap">
          <Search size={14} />
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari notifikasi…"
          />
        </div>
        <select className="select" style={{ width: 150 }} value={type} onChange={(event) => setType(event.target.value)}>
          {["Semua", "order", "inventory", "payment", "system"].map((value) => (
            <option key={value} value={value}>
              {value === "Semua" ? "Semua jenis" : typeLabels[value] ?? value}
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} aktivitas</span>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Jenis</th>
                <th>Aktivitas</th>
                <th>Sumber daya</th>
                <th>Waktu</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Belum ada notifikasi.</td></tr>
              ) : rows.map((notification) => (
                <tr key={notification.id}>
                  <td><span className="badge status-info">{typeLabels[notification.type] ?? notification.type}</span></td>
                  <td className="table-primary">{notification.title}</td>
                  <td className="muted" style={{ maxWidth: 400 }}>{notification.detail}</td>
                  <td>{formatDateID(notification.time)}</td>
                  <td><span className="badge status-success">Tercatat</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
