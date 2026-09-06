"use client";

import { Bell, Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { initialNotifications, type NotificationItem } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { formatDateID } from "@/lib/money";

export default function NotificationsPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Semua");
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiNotifications, setApiNotifications] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      bootstrapAuth().then((user) => {
        if (user?.role === "admin") {
          // No backend endpoint for admin notifications yet
          setError("Endpoint notifikasi admin belum tersedia di backend");
          setLoading(false);
        } else {
          setError("Akses ditolak: hanya admin yang dapat mengelola notifikasi");
          setLoading(false);
        }
      });
    }
  }, []);

  const sourceNotifications = DEMO_MODE ? items : apiNotifications ?? [];
  const typeLabels: Record<string, string> = {
    order: "Pesanan",
    inventory: "Inventaris",
    payment: "Pembayaran",
    system: "Sistem",
  };
  const types = ["Semua", "order", "inventory", "payment", "system"];
  const rows = useMemo(
    () =>
      sourceNotifications.filter(
        (n) => (type === "Semua" || n.type === type) && (n.title + n.detail).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, type, sourceNotifications],
  );

  const markRead = (id: string) => setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  const markAllRead = () => setItems((current) => current.map((item) => ({ ...item, read: true })));

  const unavailable = (action: string) => {
    setNotice(`${action} belum tersedia. Hubungkan ke API admin untuk mengaktifkan.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat notifikasi</h2>
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
        title="Notifikasi"
        description="Pantau dan kelola notifikasi operasional dari seluruh sistem."
        actions={
          <>
            <button className="button button-secondary button-sm" onClick={() => unavailable("Tandai semua dibaca")} disabled={!DEMO_MODE}>Tandai semua dibaca</button>
            <button className="button button-secondary button-sm" onClick={() => unavailable("Ekspor")}><Download size={13} /> Ekspor</button>
          </>
        }
      />
      {notice && <div className="notice success" role="status">{notice}</div>}
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari notifikasi…" /></div>
        <select className="select" style={{ width: 150 }} value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((v) => <option key={v} value={v}>{v === "Semua" ? "Semua jenis" : typeLabels[v] ?? v}</option>)}
        </select>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Jenis</th>
                <th>Judul</th>
                <th>Detail</th>
                <th>Waktu</th>
                <th>Status</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>Belum ada notifikasi.</td></tr>
              ) : rows.map((n) => (
                <tr key={n.id} className={n.read ? "" : "unread"}>
                  <td><span className="badge status-info">{typeLabels[n.type] ?? n.type}</span></td>
                  <td className="table-primary">{n.title}</td>
                  <td className="muted" style={{ maxWidth: 400 }}>{n.detail}</td>
                  <td>{formatDateID(n.time)}</td>
                  <td>{n.read ? <span className="badge status-success">Dibaca</span> : <span className="badge status-warning">Belum dibaca</span>}</td>
                  <td>
                    <button className="table-action" onClick={() => unavailable(`Tandai ${n.id} dibaca`)} disabled={n.read || !DEMO_MODE} aria-label="Tandai dibaca"><Bell size={13} /></button>
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