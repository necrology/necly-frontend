"use client";

import { Download, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { auditRecords } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiAuditLog } from "@/lib/admin-mappers";
import type { AuditRecord } from "@/lib/types";
import { formatDateTimeID } from "@/lib/money";

export default function AuditLogPage() {
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("Semua");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiAuditRecords, setApiAuditRecords] = useState<AuditRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      bootstrapAuth().then((user) => {
        if (user?.role === "admin") {
          adminApi.listAuditLogs({ page: 1, per_page: 50 }).then((res) => {
            try {
              const logs = (res.auditLogs as unknown as Record<string, unknown>[]) ?? [];
              const mappedLogs = logs.map(mapApiAuditLog);
              setApiAuditRecords(mappedLogs);
              setLoading(false);
            } catch {
              setError("Gagal memproses data audit log dari API");
              setLoading(false);
            }
          }).catch(() => {
            setError("Gagal memuat audit log dari server");
            setLoading(false);
          });
        } else {
          setError("Akses ditolak: hanya admin yang dapat melihat audit log");
          setLoading(false);
        }
      });
    }
  }, []);

  const sourceRecords = DEMO_MODE ? auditRecords : apiAuditRecords ?? [];
  const actors = ["Semua", ...Array.from(new Set(sourceRecords.map((record) => record.actor)))];
  const rows = useMemo(
    () =>
      sourceRecords.filter(
        (record) => (actor === "Semua" || record.actor === actor) && (record.actor + record.action + record.resource + record.ip).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, actor, sourceRecords],
  );

  const unavailable = (action: string) => {
    setNotice(`${action} belum tersedia. Hubungkan ke API admin untuk mengaktifkan.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat audit log</h2>
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
        title="Log audit"
        description="Periksa perubahan operasional material dan pelaku di balik masing-masing."
        actions={<button className="button button-secondary button-sm" onClick={() => unavailable("Ekspor CSV")}><Download size={13} /> Ekspor CSV</button>}
      />
      <div className="demo-banner"><ShieldCheck size={15} /><span>Log ini didemonstrasikan untuk traceability. Audit log produksi seharusnya immutable, berizin, dan disimpan sesuai kebijakan.</span></div>
      {notice && <div className="notice success" role="status">{notice}</div>}
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari pelaku, aksi, sumber daya, atau IP…" /></div>
        <select className="select" style={{ width: 155 }} value={actor} onChange={(e) => setActor(e.target.value)}>
          {actors.map((value) => <option key={value}>{value}</option>)}
        </select>
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} peristiwa</span>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Peristiwa</th>
                <th>Pelaku</th>
                <th>Aksi</th>
                <th>Sumber daya</th>
                <th>IP Sumber</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>Belum ada aktivitas tercatat.</td></tr>
              ) : rows.map((record) => (
                <tr key={record.id}>
                  <td className="table-primary">{record.id}</td>
                  <td>{record.actor}</td>
                  <td><span className="badge status-info">{record.action}</span></td>
                  <td>{record.resource}</td>
                  <td className="tabular">{record.ip}</td>
                  <td>{formatDateTimeID(record.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}