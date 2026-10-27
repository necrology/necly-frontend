"use client";

import { Download, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SearchableSelect } from "@/components/searchable-select";
import { initialNotifications as seedNotifications, type NotificationItem } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { formatDateID } from "@/lib/money";
import {
  NOTIFICATION_FETCH_SIZE,
  markNotificationsSeen,
  notificationFromAudit,
  notificationTypeLabels as typeLabels,
} from "@/lib/notifications";

const NOTIFICATION_PAGE_SIZE = NOTIFICATION_FETCH_SIZE;

export default function NotificationsPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Semua");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiNotifications, setApiNotifications] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");

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

      const response = await adminApi.listNotifications({ page: 1, per_page: NOTIFICATION_PAGE_SIZE });
      if (!Array.isArray(response.notifications)) {
        setError("Respons notifikasi dari server tidak sesuai kontrak");
        return;
      }

      // Backend memproyeksikan audit log sebagai notifikasi. Tidak ada status
      // baca di domain, jadi UI tidak mengarang tombol "tandai dibaca".
      setPage(typeof response.page === "number" ? response.page : 1);
      setLoaded(response.notifications.length);
      setTotal(typeof response.total === "number" ? response.total : response.notifications.length);
      setApiNotifications(response.notifications.map(notificationFromAudit));
      // Lonceng memakai penanda ini untuk menghitung notifikasi yang benar-
      // benar baru sejak halaman ini terakhir dibuka.
      markNotificationsSeen();
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

  const loadMoreNotifications = useCallback(async () => {
    if (DEMO_MODE || loadingMore || loaded >= total) return;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const response = await adminApi.listNotifications({ page: page + 1, per_page: NOTIFICATION_PAGE_SIZE });
      if (!Array.isArray(response.notifications)) {
        setLoadMoreError("Respons notifikasi berikutnya tidak sesuai kontrak.");
        return;
      }
      const next = response.notifications.map(notificationFromAudit);
      setApiNotifications((current) => {
        const seen = new Set((current ?? []).map((notification) => notification.id));
        return [...(current ?? []), ...next.filter((notification) => !seen.has(notification.id))];
      });
      setPage(typeof response.page === "number" ? response.page : page + 1);
      setLoaded((current) => current + response.notifications.length);
      setTotal(typeof response.total === "number" ? response.total : total);
    } catch {
      setLoadMoreError("Gagal memuat notifikasi berikutnya.");
    } finally {
      setLoadingMore(false);
    }
  }, [loaded, loadingMore, page, total]);

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
        description="Pantau aktivitas operasional dari audit log. Jumlah di lonceng dihitung dari notifikasi baru sejak halaman ini terakhir dibuka."
        actions={
          <button className="button button-secondary button-sm" onClick={exportRows} disabled={rows.length === 0}>
            <Download size={13} /> Ekspor
          </button>
        }
      />
      {!DEMO_MODE && (
        <div className="notice" role="status">
          Notifikasi ditampilkan dari audit log server. Status baca disimpan di perangkat ini; tidak ada aksi hapus di backend.
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
        <SearchableSelect
          className="toolbar-select"
          ariaLabel="Filter jenis notifikasi"
          options={["Semua", "order", "inventory", "payment", "system"].map((value) => ({
            value,
            label: value === "Semua" ? "Semua jenis" : typeLabels[value] ?? value,
          }))}
          value={type}
          onChange={setType}
        />
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} aktivitas</span>
        {!DEMO_MODE && total > 0 && (
          <span className="muted" style={{ fontSize: 9 }}>
            {loaded} dari {total} aktivitas dimuat
          </span>
        )}
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
      {loadMoreError && <div className="notice" role="alert" style={{ color: "var(--danger)" }}>{loadMoreError}</div>}
      {!DEMO_MODE && loaded < total && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <button className="button button-secondary button-sm" type="button" onClick={() => void loadMoreNotifications()} disabled={loadingMore}>
            {loadingMore ? "Memuat…" : "Muat lebih banyak notifikasi"}
          </button>
        </div>
      )}
    </div>
  );
}
