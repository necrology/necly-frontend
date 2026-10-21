"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authApi, isSessionExpired, useAuthStore } from "@/lib/api";

/**
 * QA baris 81-82: sesi harus berakhir saat jam perangkat melewati masa berlaku,
 * bukan hanya saat halaman di-refresh. Saat terdeteksi, akhiri sesi di server
 * (logout) supaya memundurkan tanggal kembali tidak memulihkan sesi lama.
 */
export function SessionExpiryGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const redirecting = useRef(false);

  useEffect(() => {
    redirecting.current = false;
  }, [expiresAt]);

  useEffect(() => {
    if (!isAuthenticated || !isSessionExpired(expiresAt) || redirecting.current) return;
    redirecting.current = true;
    authApi.logout()
      .catch(() => undefined)
      .finally(() => router.replace("/login?expired=1"));
  }, [pathname, expiresAt, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const check = () => {
      if (!isSessionExpired(useAuthStore.getState().expiresAt) || redirecting.current) return;
      redirecting.current = true;
      authApi.logout()
        .catch(() => undefined)
        .finally(() => router.replace("/login?expired=1"));
    };
    const interval = window.setInterval(check, 30_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [isAuthenticated, router]);

  return null;
}
