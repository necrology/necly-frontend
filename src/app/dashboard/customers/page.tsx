"use client";

import { Mail, MoreHorizontal, Search, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { customers } from "@/data/seed";
import { formatIDR } from "@/lib/money";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiUserToCustomer } from "@/lib/admin-mappers";
import type { Customer } from "@/lib/types";
import { formatDateID } from "@/lib/money";
import type { ApiUser } from "@/lib/api";

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Semua");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiCustomers, setApiCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      bootstrapAuth().then((user) => {
        if (user?.role === "admin") {
          adminApi.listUsers({ page: 1, per_page: 50 }).then((res) => {
            try {
              const users = (res.users as unknown as ApiUser[]) ?? [];
              const mappedCustomers = users.map(mapApiUserToCustomer);
              setApiCustomers(mappedCustomers);
              setLoading(false);
            } catch {
              setError("Gagal memproses data pelanggan dari API");
              setLoading(false);
            }
          }).catch(() => {
            setError("Gagal memuat pelanggan dari server");
            setLoading(false);
          });
        } else {
          setError("Akses ditolak: hanya admin yang dapat mengelola pelanggan");
          setLoading(false);
        }
      });
    }
  }, []);

  const sourceCustomers = DEMO_MODE ? customers : apiCustomers ?? [];

  const rows = useMemo(
      () =>
        sourceCustomers.filter(
          (c: Customer) => (status === "Semua" || c.status === status) && (c.name + c.email).toLowerCase().includes(query.toLowerCase()),
        ),
      [query, status, sourceCustomers],
    );

  const unavailable = (action: string) => {
    setNotice(`${action} belum tersedia. Hubungkan ke API admin untuk mengaktifkan.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat pelanggan</h2>
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
        title="Pelanggan"
        description="Pantau pelanggan akun sharing, status verifikasi, dan riwayat pesanan slot langganan hemat."
        actions={<button className="button button-primary button-sm" onClick={() => unavailable("Undang pelanggan")}><UserPlus size={13} /> Undang pelanggan</button>}
      />
      <section className="metric-grid">
        <MetricCard label="Total pelanggan" value={String(sourceCustomers.length)} change="Data pelanggan terdaftar" />
        <MetricCard label="Pelanggan aktif" value={String(sourceCustomers.filter((c) => c.status === "Aktif").length)} change="Akun siap bertransaksi" />
        <MetricCard label="Terverifikasi" value={String(sourceCustomers.filter((c) => c.verified).length)} change="Email terkonfirmasi" />
        <MetricCard label="Total pesanan" value={String(sourceCustomers.reduce((sum, c) => sum + (c.orders || 0), 0))} change="Akumulasi pesanan slot" />
      </section>
      {notice && <div className="notice success" role="status">{notice}</div>}
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari pelanggan…" /></div>
        <select className="select" style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["Semua", "Aktif", "Baru", "Nonaktif"].map((v) => <option key={v}>{v}</option>)}
        </select>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pelanggan</th>
                <th>Status</th>
                <th>Peran</th>
                <th>Terverifikasi</th>
                <th>Pesanan</th>
                <th>Total belanja</th>
                <th>Bergabung</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={8} className="muted" style={{ textAlign: "center" }}>Belum ada pelanggan.</td></tr>
              ) : rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="avatar" style={{ width: 32, height: 32, fontSize: 8 }}>{c.initials}</span>
                      <span>
                        <span className="table-primary">{c.name}</span>
                        <br />
                        <span className="table-secondary">{c.email}</span>
                      </span>
                    </div>
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.role}</td>
                  <td><span className={`badge ${c.verified ? "status-success" : "status-warning"}`}>{c.verified ? "Ya" : "Belum"}</span></td>
                  <td className="tabular">{c.orders}</td>
                  <td className="tabular">{formatIDR(c.spend)}</td>
                  <td>{formatDateID(c.joined)}</td>
                  <td>
                    <button className="table-action" aria-label={`Opsi untuk ${c.name}`} onClick={() => unavailable(`Opsi untuk ${c.name}`)} disabled={!DEMO_MODE}><MoreHorizontal size={13} /></button>
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