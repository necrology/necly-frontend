"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { bootstrapAuth, useAuthStore, DEMO_MODE } from "@/lib/api";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardGuardProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "seller")[];
}

export function DashboardGuard({ children, allowedRoles = ["admin", "seller"] }: DashboardGuardProps) {
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

        if (!allowedRoles.includes(sessionUser.role as "admin" | "seller")) {
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
  }, [router, searchParams, allowedRoles]);

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
            Anda tidak memiliki izin untuk mengakses halaman ini. Hanya admin dan penjual yang diizinkan.
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

  return <>{children}</>;
}