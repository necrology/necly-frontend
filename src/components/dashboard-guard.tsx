"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { bootstrapAuth, useAuthStore, DEMO_MODE } from "@/lib/api";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardGuardProps {
  children: React.ReactNode;
}

// Backend C19 hanya mengizinkan admin. Guard ini tidak menyediakan prop peran
// yang bisa dipakai untuk memperlebar akses penjual.
export function DashboardGuard({ children }: DashboardGuardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof useAuthStore.getState>["user"] | null>(null);

  useEffect(() => {
    if (DEMO_MODE) {
      Promise.resolve().then(() => setIsLoading(false));
      return;
    }

    let cancelled = false;

    async function checkAuth() {
      setIsLoading(true);
      setError(null);
      setForbidden(false);

      try {
        const sessionUser = await bootstrapAuth();

        if (cancelled) return;

        if (!sessionUser) {
          // Not authenticated - redirect to login with redirect param
          const redirect = searchParams.get("redirect") ?? "/dashboard";
          router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
          return;
        }

        if (sessionUser.role !== "admin") {
          setForbidden(true);
          return;
        }

        setUser(sessionUser);
      } catch {
        if (cancelled) return;
        setError("Gagal memverifikasi sesi. Silakan coba lagi atau masuk kembali.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (DEMO_MODE) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 320 }}>
          <Loader2 className={cn("animate-spin", "text-blue-600")} size={32} style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Memuat dashboard</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Memverifikasi sesi dan hak akses...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <AlertCircle className="text-red-600" size={32} style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat dashboard</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            {error}
          </p>
          <button
            className="button button-primary button-sm"
            onClick={() => router.refresh()}
            style={{ minWidth: 160 }}
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <Lock className="text-amber-600" size={32} style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Akses ditolak</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            Anda tidak memiliki izin untuk mengakses halaman ini. Halaman dashboard hanya untuk admin.
          </p>
          <button
            className="button button-secondary button-sm"
            onClick={() => router.push("/")}
            style={{ minWidth: 160 }}
          >
            Kembali ke marketplace
          </button>
        </div>
      </div>
    );
  }

  // Tanpa sesi, jangan pernah merender children: halaman anak akan memicu
  // permintaan data admin sebelum pengalihan ke login selesai.
  if (!user) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 320 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Mengalihkan ke login</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Sesi tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}