"use client";

import {
  ClipboardList,
  LoaderCircle,
  Search,
  ShoppingBag,
  Tags,
  TicketCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DASHBOARD_SEARCH_DEBOUNCE_MS,
  DASHBOARD_SEARCH_MIN_CHARS,
  searchDashboard,
  type DashboardSearchKind,
  type DashboardSearchResponse,
  type DashboardSearchResult,
} from "@/lib/dashboard-search";
import { cn } from "@/lib/utils";

const RESULT_ICONS = {
  order: ClipboardList,
  customer: Users,
  product: ShoppingBag,
  category: Tags,
  voucher: TicketCheck,
} as const satisfies Record<DashboardSearchKind, typeof Search>;

const SEARCH_RESULTS_ID = "dashboard-global-search-results";

export function DashboardGlobalSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DashboardSearchResponse | null>(null);
  const [error, setError] = useState<{ query: string; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= DASHBOARD_SEARCH_MIN_CHARS;
  // Hasil dan error disimpan bersama query-nya. Dengan begitu query yang baru
  // diketik tidak pernah menampilkan hasil lama tanpa perlu setState sinkron
  // di dalam effect.
  const visibleResult = canSearch && result?.query === trimmed ? result : null;
  const visibleError = canSearch && error?.query === trimmed ? error.message : "";
  const loading = canSearch && !visibleResult && !visibleError;
  const flatResults = useMemo(
    () => visibleResult?.groups.flatMap((group) => group.results) ?? [],
    [visibleResult],
  );
  const resultIndex = useMemo(
    () => new Map(flatResults.map((item, index) => [item.id, index])),
    [flatResults],
  );

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
          setActiveIndex(-1);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setError({ query: trimmed, message: "Pencarian gagal dimuat. Periksa koneksi lalu coba lagi." });
        });
    }, DASHBOARD_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [canSearch, trimmed]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Ctrl/Cmd+K adalah pintasan yang sudah tertulis di topbar; sebelumnya
  // labelnya ada tetapi tidak ada handler yang benar-benar memfokuskannya.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
      setOpen(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setResult(null);
    setError(null);
    setActiveIndex(-1);
    setOpen(false);
    inputRef.current?.focus();
  }, []);

  const openFullResults = useCallback(
    (value: string) => {
      const target = value.trim();
      if (target.length < DASHBOARD_SEARCH_MIN_CHARS) return;
      setOpen(false);
      router.push(`/dashboard/search?q=${encodeURIComponent(target)}`);
    },
    [router],
  );

  const choose = useCallback((item: DashboardSearchResult) => {
    setOpen(false);
    router.push(item.href);
  }, [router]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      if (flatResults.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % flatResults.length);
      return;
    }
    if (event.key === "ArrowUp") {
      if (flatResults.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? flatResults.length - 1 : index - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const active = activeIndex >= 0 ? flatResults[activeIndex] : null;
      if (active) {
        choose(active);
        return;
      }
      openFullResults(query);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  const showPanel = open && trimmed.length > 0;

  return (
    <div className="topbar-search-wrap" ref={rootRef}>
      <div className="input-wrap topbar-search">
        <Search size={14} />
        <input
          ref={inputRef}
          className="input"
          type="search"
          value={query}
          placeholder="Cari pesanan, pelanggan, atau produk…"
          aria-label="Cari di dashboard"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={SEARCH_RESULTS_ID}
          aria-activedescendant={activeIndex >= 0 ? `dashboard-search-result-${activeIndex}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button className="topbar-search-clear" type="button" aria-label="Bersihkan pencarian" onClick={reset}>
            <X size={12} />
          </button>
        ) : (
          <span className="topbar-shortcut" aria-hidden="true">Ctrl K</span>
        )}
      </div>

      {showPanel && (
        <div className="global-search-popover">
          {trimmed.length < DASHBOARD_SEARCH_MIN_CHARS && (
            <p className="global-search-state">Ketik minimal {DASHBOARD_SEARCH_MIN_CHARS} karakter untuk mencari.</p>
          )}
          {canSearch && loading && (
            <p className="global-search-state"><LoaderCircle className="spin" size={13} /> Mencari “{trimmed}”…</p>
          )}
          {canSearch && visibleError && <p className="global-search-state is-error" role="alert">{visibleError}</p>}
          {canSearch && visibleResult && visibleResult.total === 0 && (
            <p className="global-search-state">Tidak ada hasil untuk “{trimmed}”.</p>
          )}
          <div id={SEARCH_RESULTS_ID} role="listbox" aria-label="Hasil pencarian dashboard">
          {canSearch && visibleResult && visibleResult.groups.map((group) => (
            <div className="global-search-group" role="group" aria-label={group.label} key={group.kind}>
              <div className="global-search-group-label">{group.label}</div>
              <ul>
                {group.results.map((item) => {
                  const Icon = RESULT_ICONS[item.kind];
                  const index = resultIndex.get(item.id) ?? -1;
                  return (
                    <li key={item.id}>
                      <Link
                        id={`dashboard-search-result-${index}`}
                        className={cn("global-search-result", index === activeIndex && "is-active")}
                        href={item.href}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => setOpen(false)}
                      >
                        <span className="global-search-icon" aria-hidden="true"><Icon size={14} /></span>
                        <span className="global-search-copy">
                          <strong>{item.title}</strong>
                          {item.subtitle && <small>{item.subtitle}</small>}
                          {item.meta && <span>{item.meta}</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          </div>
          {canSearch && (
            <button className="global-search-footer" type="button" onClick={() => openFullResults(query)}>
              Lihat semua hasil untuk “{trimmed}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
