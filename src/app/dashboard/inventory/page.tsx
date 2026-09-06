"use client";

import { AlertTriangle, Boxes, CalendarClock, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { services, type SubscriptionProduct } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiInventoryAccount } from "@/lib/admin-mappers";
import type { InventoryAccount } from "@/lib/types";
import { formatDateID } from "@/lib/money";

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const [stocks, setStocks] = useState(() => Object.fromEntries(services.map((product) => [product.id, product.stock])));
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiAccounts, setApiAccounts] = useState<InventoryAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      bootstrapAuth().then((user) => {
        if (user?.role === "admin") {
          adminApi.listInventoryAccounts({ page: 1, per_page: 50 }).then((res) => {
            try {
              const accounts = (res.accounts as unknown as Record<string, unknown>[]) ?? [];
              const mappedAccounts = accounts.map(mapApiInventoryAccount);
              setApiAccounts(mappedAccounts);
              setLoading(false);
            } catch {
              setError("Gagal memproses data inventaris dari API");
              setLoading(false);
            }
          }).catch(() => {
            setError("Gagal memuat inventaris dari server");
            setLoading(false);
          });
        } else {
          setError("Akses ditolak: hanya admin yang dapat mengelola inventaris");
          setLoading(false);
        }
      });
    }
  }, []);

  const sourceProducts = DEMO_MODE ? services : [];
  const rows = useMemo(
    () => sourceProducts.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())),
    [query, sourceProducts],
  );

  const total = Object.values(stocks).reduce((sum, value) => sum + value, 0);
  const low = Object.values(stocks).filter((value) => value <= 2).length;
  const waitlist = Object.values(stocks).filter((value) => value === 0).length;

  const add = (id: string, name: string) => {
    setStocks((current) => ({ ...current, [id]: current[id] + 1 }));
    setNotice(`Ditambahkan satu slot demo ke ${name}.`);
  };

  const unavailable = (action: string) => {
    setNotice(`${action} belum tersedia. Hubungkan ke API admin untuk mengaktifkan.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat inventaris</h2>
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
        title="Inventaris slot akun"
        description="Kelola kapasitas slot anggota pada akun langganan sharing sebelum ditawarkan ke pelanggan."
        actions={<button className="button button-secondary button-sm" type="button" onClick={() => unavailable("Kalender ketersediaan")}><CalendarClock size={13} /> Kalender ketersediaan</button>}
      />
      <section className="metric-grid">
        <MetricCard label="Slot terbuka" value={String(total)} change="Total kapasitas slot aktif" icon={<Boxes size={14} />} />
        <MetricCard label="Ketersediaan rendah" value={String(low)} change="Perlu penambahan akun induk" icon={<AlertTriangle size={14} />} />
        <MetricCard label="Daftar tunggu" value={String(waitlist)} change="Menunggu alokasi akun baru" />
        <MetricCard label="Status inventaris" value={DEMO_MODE ? "Siap sharing" : "Live operasional"} change="Kapasitas akun terpantau" />
      </section>
      {notice && <div className="notice success" role="status">{notice}</div>}
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari inventaris…" /></div>
        <span className="muted" style={{ fontSize: 9 }}>Perubahan adalah status demo lokal</span>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Operator</th>
                <th>Slot terbuka</th>
                <th>Kapasitas</th>
                <th>Status</th>
                <th>Buka berikutnya</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={7} className="muted" style={{ textAlign: "center" }}>Belum ada akun atau slot langganan.</td></tr>
              ) : rows.map((product) => {
                const stock = stocks[product.id];
                return (
                  <tr key={product.id}>
                    <td className="table-primary">{product.name}</td>
                    <td>{product.operator.name}</td>
                    <td className="tabular">{stock}</td>
                    <td>
                      <div className="inventory-bar" aria-label={`${stock} dari 10 slot tersedia`}>
                        <span style={{ width: `${Math.min(stock * 10, 100)}%` }} />
                      </div>
                    </td>
                    <td><StatusBadge status={stock === 0 ? "Daftar tunggu" : stock <= 2 ? "Rendah" : "Aktif"} /></td>
                    <td>{stock === 0 ? "14 Sep 2026" : "Tersedia sekarang"}</td>
                    <td>
                      <button className="button button-secondary button-sm" type="button" onClick={() => unavailable(`Tambah slot ${product.name}`)} disabled={!DEMO_MODE}>
                        <Plus size={12} /> Slot
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}