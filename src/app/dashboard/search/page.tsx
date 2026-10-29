"use client";

import {
  ClipboardList,
  LoaderCircle,
  Search,
  ShoppingBag,
  Tags,
  TicketCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  DASHBOARD_SEARCH_DEBOUNCE_MS,
  DASHBOARD_SEARCH_LABELS,
  DASHBOARD_SEARCH_LIST_HREF,
  DASHBOARD_SEARCH_MIN_CHARS,
  searchDashboard,
  type DashboardSearchKind,
  type DashboardSearchResponse,
} from "@/lib/dashboard-search";

const RESULT_ICONS = {
  order: ClipboardList,
  customer: Users,
  product: ShoppingBag,
  category: Tags,
  voucher: TicketCheck,
} as const satisfies Record<DashboardSearchKind, typeof Search>;

function initialQuery() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

export default function DashboardSearchPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DashboardSearchResponse | null>(null);
  const [error, setError] = useState<{ query: string; message: string } | null>(null);
  const requestIdRef = useRef(0);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= DASHBOARD_SEARCH_MIN_CHARS;
  const visibleResult = canSearch && result?.query === trimmed ? result : null;
  const visibleError = canSearch && error?.query === trimmed ? error.message : "";
  const loading = canSearch && !visibleResult && !visibleError;

  useEffect(() => {
    const sync = () => {
      setQuery(initialQuery());
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (!canSearch) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timer = window.setTimeout(() => {
      void searchDashboard(trimmed)
        .then((response) => {
          if (requestIdRef.current !== requestId) return;
          setResult(response);
          setError(null);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setError({ query: trimmed, message: "Pencarian gagal dimuat. Periksa koneksi lalu coba lagi." });
        });
    }, DASHBOARD_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [canSearch, trimmed]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSearch) return;
    window.history.replaceState(null, "", `/dashboard/search?q=${encodeURIComponent(trimmed)}`);
  };

  const title = useMemo(() => {
    if (!canSearch) return "Cari data dashboard";
    if (loading) return `Mencari “${trimmed}”…`;
    if (visibleResult) return `${visibleResult.total} hasil untuk “${visibleResult.query}”`;
    return `Hasil untuk “${trimmed}”`;
  }, [canSearch, loading, visibleResult, trimmed]);

  return (
    <div className="dashboard-page dashboard-search-page">
      <PageHeader
        title="Pencarian dashboard"
        description="Cari pesanan, pelanggan, produk, kategori, dan voucher dari satu tempat."
      />

      <form className="card dashboard-search-form" role="search" onSubmit={submit}>
        <div className="input-wrap">
          <Search size={14} />
          <input
            className="input"
            type="search"
            value={query}
            autoFocus
            placeholder="Ketik nomor pesanan, nama pelanggan, produk, kategori, atau kode voucher…"
            aria-label="Kata kunci pencarian dashboard"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button className="button button-primary button-sm" type="submit" disabled={!canSearch || loading}>
          Cari
        </button>
      </form>

      <div className="dashboard-search-summary">
        <strong>{title}</strong>
        {canSearch && !loading && visibleResult && visibleResult.total > 0 && (
          <span className="muted">Pilih hasil untuk membuka data terkait.</span>
        )}
      </div>

      {canSearch && loading && (
        <p className="dashboard-search-state"><LoaderCircle className="spin" size={14} /> Memuat hasil pencarian…</p>
      )}
      {canSearch && visibleError && <p className="dashboard-search-state is-error" role="alert">{visibleError}</p>}
      {canSearch && !loading && !visibleError && visibleResult && visibleResult.total === 0 && (
        <div className="card dashboard-search-empty">
          <Search size={20} aria-hidden="true" />
          <strong>Tidak ada data yang cocok</strong>
          <p>Coba kata kunci lain, misalnya nomor pesanan, email pelanggan, nama produk, atau kode voucher.</p>
        </div>
      )}

      {canSearch && !loading && !visibleError && visibleResult?.groups.map((group) => {
        const Icon = RESULT_ICONS[group.kind];
        const href = `${DASHBOARD_SEARCH_LIST_HREF[group.kind]}?search=${encodeURIComponent(trimmed)}`;
        return (
          <section className="card dashboard-search-group-card" key={group.kind} aria-labelledby={`search-group-${group.kind}`}>
            <div className="dashboard-search-group-head">
              <div>
                <h2 id={`search-group-${group.kind}`}><Icon size={14} aria-hidden="true" /> {DASHBOARD_SEARCH_LABELS[group.kind]}</h2>
                <span className="muted">{group.results.length} hasil teratas</span>
              </div>
              <Link href={href}>Buka halaman {DASHBOARD_SEARCH_LABELS[group.kind].toLocaleLowerCase("id-ID")}</Link>
            </div>
            <ul className="dashboard-search-result-list">
              {group.results.map((item) => (
                <li key={item.id}>
                  <Link className="dashboard-search-result" href={item.href}>
                    <span className="dashboard-search-result-copy">
                      <strong>{item.title}</strong>
                      {item.subtitle && <small>{item.subtitle}</small>}
                      {item.meta && <span>{item.meta}</span>}
                    </span>
                    <span className="dashboard-search-result-action">Buka</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
