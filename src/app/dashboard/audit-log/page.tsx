"use client";

import { Download, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SearchableSelect } from "@/components/searchable-select";
import { auditRecords } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { mapApiAuditLog } from "@/lib/admin-mappers";
import type { AuditRecord } from "@/lib/types";
import { formatDateTimeWIB } from "@/lib/money";

export default function AuditLogPage() {
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("Semua");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiAuditRecords, setApiAuditRecords] = useState<AuditRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const user = await bootstrapAuth();
      if (!user) {
        setError("Sesi tidak valid. Silakan masuk kembali.");
        return;
      }
      if (user.role !== "admin") {
        // Penjual tidak boleh memicu request data audit admin.
        setError("Akses ditolak: hanya admin yang dapat melihat audit log");
        return;
      }

      const response = await adminApi.listAuditLogs({ page: 1, per_page: 50 });
      if (!Array.isArray(response.logs)) {
        setError("Respons audit log dari server tidak sesuai kontrak");
        return;
      }

      try {
        setApiAuditRecords(response.logs.map((log) => mapApiAuditLog(log as unknown as Record<string, unknown>)));
      } catch {
        setError("Gagal memproses data audit log dari API");
      }
    } catch {
      setError("Gagal memuat audit log dari server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    void Promise.resolve().then(() => loadAuditLogs());
  }, [loadAuditLogs, reloadToken]);

  const sourceRecords = useMemo(() => DEMO_MODE ? auditRecords : apiAuditRecords ?? [], [apiAuditRecords]);
  const actors = ["Semua", ...Array.from(new Set(sourceRecords.map((record) => record.actor)))];
  const rows = useMemo(
    () =>
      sourceRecords.filter(
        (record) => (actor === "Semua" || record.actor === actor) && (record.actor + record.action + record.resource + record.ip).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, actor, sourceRecords],
  );

  const exportCsv = () => {
    downloadCsv(
      `necly-audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Peristiwa", "Pelaku", "Aksi", "Sumber daya", "IP", "Waktu"],
      rows.map((record) => [record.id, record.actor, record.action, record.resource, record.ip, record.time]),
    );
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
            onClick={() => setReloadToken((value) => value + 1)}
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
        actions={<button className="button button-secondary button-sm" onClick={exportCsv} disabled={rows.length === 0}><Download size={13} /> Ekspor CSV</button>}
      />
      <div className="demo-banner"><ShieldCheck size={15} /><span>Log ini didemonstrasikan untuk traceability. Audit log produksi seharusnya immutable, berizin, dan disimpan sesuai kebijakan.</span></div>
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari pelaku, aksi, sumber daya, atau IP…" /></div>
        <SearchableSelect
          className="toolbar-select"
          ariaLabel="Filter pelaku audit"
          options={actors.map((value) => ({ value, label: value }))}
          value={actor}
          onChange={setActor}
        />
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
                <th>Waktu (WIB)</th>
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
                  <td className="tabular">{record.ip || "—"}</td>
                  <td>{record.time ? formatDateTimeWIB(record.time) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
