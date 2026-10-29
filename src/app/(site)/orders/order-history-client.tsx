"use client";

import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogIn,
  PackageOpen,
  ReceiptText,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { ApiError, bootstrapAuth, checkoutApi, DEMO_MODE, type ApiOrder } from "@/lib/api";
import { formatDateTimeID, formatIDR } from "@/lib/money";

const PER_PAGE = 5;

type LoadError = {
  kind: "unauthorized" | "generic";
  message: string;
};

/**
 * Hanya dipakai ketika NEXT_PUBLIC_DEMO_MODE=true. Mode live selalu memanggil
 * API dan tidak pernah mengganti kegagalan dengan pesanan contoh.
 */
const DEMO_ORDERS: ApiOrder[] = [
  {
    id: "demo-order-1",
    number: "NCL-DEMO-260906",
    status: "processing",
    subtotal: 109_000,
    discount: 0,
    total: 109_000,
    currency: "IDR",
    payment_due_at: "2026-09-07T10:00:00Z",
    created_at: "2026-09-06T10:00:00Z",
    updated_at: "2026-09-06T10:04:00Z",
    items: [
      {
        id: "demo-item-1",
        product_price_id: "demo-price-1",
        product_name: "StreamFlix Keluarga (Demo)",
        duration_name: "3 bulan",
        unit_price: 109_000,
        quantity: 1,
        device_count: 1,
        line_total: 109_000,
      },
    ],
  },
  {
    id: "demo-order-2",
    number: "NCL-DEMO-260905",
    status: "paid",
    subtotal: 32_000,
    discount: 0,
    total: 32_000,
    currency: "IDR",
    payment_due_at: "2026-09-06T10:00:00Z",
    created_at: "2026-09-05T10:00:00Z",
    updated_at: "2026-09-05T10:05:00Z",
    items: [
      {
        id: "demo-item-2",
        product_price_id: "demo-price-2",
        product_name: "CineMax Anggota Keluarga (Demo)",
        duration_name: "1 bulan",
        unit_price: 32_000,
        quantity: 1,
        device_count: 1,
        line_total: 32_000,
      },
    ],
  },
];

function itemSummary(order: ApiOrder) {
  const items = order.items ?? [];
  if (items.length === 0) return "Detail layanan tersedia di halaman pesanan.";
  const names = items.slice(0, 2).map((item) => item.product_name).join(", ");
  return items.length > 2 ? `${names}, +${items.length - 2} layanan lain` : names;
}

function errorFromFailure(error: unknown): LoadError {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    return {
      kind: "unauthorized",
      message: "Sesi Anda sudah berakhir. Masuk kembali untuk melihat riwayat pesanan.",
    };
  }
  return {
    kind: "generic",
    message: "Gagal memuat riwayat pesanan. Periksa koneksi Anda lalu coba lagi.",
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validasi runtime satu item pesanan. TypeScript hanya memeriksa bentuk saat
 * compile-time, sedangkan JSON dari server tidak pernah divalidasi compiler.
 * `product_name` dipakai ringkasan daftar, jadi wajib ada agar tidak muncul
 * baris kosong/`undefined` di UI.
 */
function isValidOrderItem(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isNonEmptyString(item.product_name);
}

/**
 * Validasi runtime satu elemen `orders[]`. Payload HTTP-success bisa lolos
 * `Array.isArray` tetapi tiap elemennya tidak sesuai kontrak; merendernya
 * menghasilkan `RpNaN`, tautan `/orders/undefined`, tanggal kosong, dan React
 * warning karena `key` tidak unik. Field di bawah adalah yang benar-benar
 * dipakai render, jadi minimal itu yang harus diperiksa.
 */
function isValidOrder(value: unknown): value is ApiOrder {
  if (value === null || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  return (
    isNonEmptyString(order.id) &&
    isNonEmptyString(order.number) &&
    isNonEmptyString(order.status) &&
    isNonEmptyString(order.created_at) &&
    typeof order.total === "number" &&
    Number.isFinite(order.total) &&
    Array.isArray(order.items) &&
    order.items.every(isValidOrderItem)
  );
}

export function OrderHistoryClient() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Dipakai saat page saat ini sudah melewati halaman terakhir (total
    // menyusut antar-request). Kita pindah ke page terakhir dan fetch ulang,
    // jadi loading sengaja tetap aktif sampai fetch ulang selesai.
    let redirectedToLastPage = false;

    async function loadOrders() {
      setLoading(true);
      setError(null);

      if (DEMO_MODE) {
        setOrders(DEMO_ORDERS);
        setTotal(DEMO_ORDERS.length);
        setLoading(false);
        return;
      }

      try {
        // Token akses hanya hidup di memori. Setelah pembayaran pengguna bisa
        // kembali lewat tautan atau reload, jadi sesi dipulihkan lebih dulu.
        const user = await bootstrapAuth();
        if (cancelled) return;
        if (!user) {
          setOrders([]);
          setTotal(0);
          setError({
            kind: "unauthorized",
            message: "Masuk untuk melihat seluruh riwayat pesanan Anda.",
          });
          return;
        }

        const response = await checkoutApi.listOrders({ page, per_page: PER_PAGE });
        if (cancelled) return;

        if (!Array.isArray(response.orders) || !response.orders.every(isValidOrder)) {
          setOrders([]);
          setTotal(0);
          setError({
            kind: "generic",
            message: "Respons riwayat pesanan dari server tidak sesuai kontrak.",
          });
          return;
        }

        const safeTotal = Number.isFinite(response.total)
          ? response.total
          : response.orders.length;
        // Total bisa menyusut di antara dua request (mis. pesanan dibatalkan
        // di tab lain). Jangan commit daftar kosong dari page yang sudah tidak
        // valid: turun ke halaman terakhir yang masih ada lalu fetch ulang.
        const lastPage = Math.max(1, Math.ceil(safeTotal / PER_PAGE));
        if (page > lastPage) {
          redirectedToLastPage = true;
          setPage(lastPage);
          return;
        }

        setOrders(response.orders);
        setTotal(safeTotal);
      } catch (failure) {
        if (cancelled) return;
        setOrders([]);
        setTotal(0);
        setError(errorFromFailure(failure));
      } finally {
        if (!cancelled && !redirectedToLastPage) setLoading(false);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total]);
  const firstRow = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const lastRow = Math.min(page * PER_PAGE, total);

  return (
    <>
      <header className="page-hero">
        <div className="container">
          <span className="eyebrow orders-eyebrow">Pesanan saya</span>
          <h1 className="h1" style={{ marginTop: 12 }}>Riwayat pesanan</h1>
          <p className="lede" style={{ marginTop: 12 }}>
            Semua pesanan yang pernah Anda buat tersimpan di sini, termasuk status pembayaran dan akses layanan.
          </p>
        </div>
      </header>

      <section className="container orders-page" aria-busy={loading}>
        {DEMO_MODE && (
          <div className="demo-banner" role="status">
            <ReceiptText size={16} />
            <span>Mode demo: daftar ini berisi pesanan contoh dan tidak terhubung ke transaksi nyata.</span>
          </div>
        )}

        {loading ? (
          <div className="orders-skeleton" aria-label="Memuat riwayat pesanan" role="status">
            {[0, 1, 2].map((row) => (
              <div className="card order-list-item" key={row}>
                <div className="order-list-main">
                  <span className="skeleton" style={{ width: 180, height: 16 }} />
                  <span className="skeleton" style={{ width: "60%", height: 12 }} />
                </div>
                <div className="order-list-side">
                  <span className="skeleton" style={{ width: 90, height: 16 }} />
                  <span className="skeleton" style={{ width: 110, height: 36 }} />
                </div>
              </div>
            ))}
            <span className="muted small">Memuat pesanan…</span>
          </div>
        ) : error ? (
          <div className="card orders-state" role="alert">
            {error.kind === "unauthorized" ? <LogIn size={32} style={{ color: "var(--blue)" }} /> : <TriangleAlert size={32} style={{ color: "var(--danger)" }} />}
            <h2 className="h3">{error.kind === "unauthorized" ? "Masuk untuk melihat pesanan" : "Tidak dapat memuat pesanan"}</h2>
            <p className="muted small" style={{ maxWidth: 460 }}>{error.message}</p>
            {error.kind === "unauthorized" ? (
              <Link className="button button-primary button-sm" href="/login?redirect=%2Forders">
                <LogIn size={14} /> Masuk
              </Link>
            ) : (
              <button className="button button-primary button-sm" type="button" onClick={() => setReloadToken((value) => value + 1)}>
                <RefreshCw size={14} /> Coba lagi
              </button>
            )}
          </div>
        ) : orders.length === 0 ? (
          <div className="card orders-state">
            <PackageOpen size={32} style={{ color: "var(--muted)" }} />
            <h2 className="h3">Belum ada pesanan</h2>
            <p className="muted small" style={{ maxWidth: 460 }}>
              Pesanan yang Anda buat akan muncul di sini beserta status pembayaran dan detail aksesnya.
            </p>
            <Link className="button button-primary button-sm" href="/products">Lihat layanan</Link>
          </div>
        ) : (
          <>
            <div className="orders-summary">
              <p className="muted small" style={{ margin: 0 }}>
                Menampilkan {firstRow}–{lastRow} dari {total} pesanan
              </p>
            </div>

            <ul className="orders-list">
              {orders.map((order) => (
                <li key={order.id}>
                  <article className="card order-list-item">
                    <div className="order-list-main">
                      <div className="order-list-title">
                        <strong>{order.number}</strong>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="muted order-list-meta">
                        <CalendarDays size={13} aria-hidden="true" />
                        <span>Dibuat {formatDateTimeID(order.created_at)}</span>
                      </p>
                      <p className="order-list-items">{itemSummary(order)}</p>
                    </div>
                    <div className="order-list-side">
                      <span className="muted small">Total</span>
                      <strong className="order-list-total tabular">{formatIDR(order.total)}</strong>
                      <Link
                        className="button button-secondary button-sm"
                        href={`/orders/${encodeURIComponent(order.id)}`}
                        aria-label={`Lihat detail pesanan ${order.number}`}
                      >
                        Lihat detail <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <nav className="orders-pagination" aria-label="Halaman riwayat pesanan">
                <button
                  className="button button-secondary button-sm"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft size={14} /> Sebelumnya
                </button>
                <span className="muted small" aria-live="polite">Halaman {page} dari {totalPages}</span>
                <button
                  className="button button-secondary button-sm"
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  Berikutnya <ChevronRight size={14} />
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
