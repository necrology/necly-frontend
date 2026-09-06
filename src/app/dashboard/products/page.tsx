"use client";

import { Edit3, Eye, MoreHorizontal, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatIDR } from "@/lib/money";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiProductToSubscriptionProduct } from "@/lib/admin-mappers";
import type { SubscriptionProduct } from "@/lib/types";
import type { ApiProduct } from "@/lib/api";

const categories = ["Semua", "Streaming", "Produktivitas", "Kreatif", "Edukasi", "Keamanan"] as const;

export default function DashboardProductsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiProducts, setApiProducts] = useState<SubscriptionProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      bootstrapAuth().then((user) => {
        if (user?.role === "admin") {
          adminApi.listProducts({ page: 1, per_page: 50 }).then((res) => {
            try {
              const products = (res.products as unknown as ApiProduct[]) ?? [];
              const mappedProducts = products.map(mapApiProductToSubscriptionProduct);
              setApiProducts(mappedProducts);
              setLoading(false);
            } catch {
              setError("Gagal memproses data produk dari API");
              setLoading(false);
            }
          }).catch(() => {
            setError("Gagal memuat produk dari server");
            setLoading(false);
          });
        } else {
          setError("Akses ditolak: hanya admin yang dapat mengelola produk");
          setLoading(false);
        }
      });
    }
  }, []);

  const [demoProducts, setDemoProducts] = useState<SubscriptionProduct[]>([]);

  useEffect(() => {
    if (DEMO_MODE) {
      import("@/data/seed").then((mod) => setDemoProducts(mod.services));
    }
  }, []);

  const renderProducts = DEMO_MODE ? demoProducts : apiProducts ?? [];

  const rows = useMemo(
    () =>
      renderProducts.filter(
        (product) =>
          (category === "Semua" || product.category === category) &&
          product.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, category, renderProducts],
  );

  const unavailable = (action: string) => {
    setNotice(`${action} belum tersedia. Hubungkan ke API admin untuk mengaktifkan.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat produk</h2>
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
        title="Produk akun sharing"
        description="Kelola paket akun langganan sharing, harga, dan ketersediaan slot anggota agar pelanggan bisa berlangganan lebih hemat."
        actions={<button className="button button-primary button-sm" onClick={() => unavailable("Tambah produk")}><Plus size={13} /> Tambah produk</button>}
      />
      {notice && <div className="notice success" role="status">{notice}</div>}
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk…" /></div>
        <select className="select" style={{ width: 170 }} value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} hasil</span>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Harga awal</th>
                <th>Ketersediaan slot</th>
                <th>Pengelola akun</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>Belum ada produk akun sharing.</td></tr>
              ) : rows.map((product) => (
                <tr key={product.id}>
                  <td>
                    <span className="table-primary">{product.name}</span>
                    <br />
                    <span className="table-secondary">{product.id}</span>
                  </td>
                  <td>{product.category}</td>
                  <td className="tabular">{formatIDR(product.price)}</td>
                  <td>
                    <StatusBadge status={product.stock > 0 ? "Aktif" : "Daftar tunggu"} />
                    <span className="table-secondary" style={{ marginLeft: 7 }}>{product.stock} slot</span>
                  </td>
                  <td>{product.operator.name}</td>
                  <td>
                    <div className="table-actions">
                      <button className="table-action" aria-label={`Pratinjau ${product.name}`} onClick={() => unavailable(`Pratinjau ${product.name}`)}>
                        <Eye size={13} />
                      </button>
                      <button className="table-action" aria-label={`Edit ${product.name}`} onClick={() => unavailable(`Edit ${product.name}`)} disabled={!DEMO_MODE}>
                        <Edit3 size={13} />
                      </button>
                      <button className="table-action" aria-label={`Opsi lain untuk ${product.name}`} onClick={() => unavailable("Opsi produk")} disabled={!DEMO_MODE}>
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
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