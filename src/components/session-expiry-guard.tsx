"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  authApi,
  consumeSessionExpiredSignal,
  isSessionExpired,
  SESSION_EXPIRED_EVENT,
  useAuthStore,
} from "@/lib/api";

/**
 * QA baris 80: sesi harus berakhir begitu jam perangkat melewati masa berlaku,
 * termasuk saat pengguna berpindah halaman SPA — bukan hanya saat refresh.
 * Sinyal 401 dari apiRequest juga ditangkap supaya state lokal yang sudah
 * dibersihkan tidak membuat guard mengira tidak ada sesi.
 */
export function SessionExpiryGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const redirecting = useRef(false);

  const endSession = useCallback(() => {
    // Halaman Log In adalah tujuan akhir; jangan mengulang redirect di sana.
    if (redirecting.current || pathname.startsWith("/login")) return;
    redirecting.current = true;
    useAuthStore.getState().clearAuth();
    // Cookie refresh tetap dikirim walau token akses sudah dihapus dari memori.
    void authApi.logout().catch(() => undefined);
    router.replace("/login?expired=1");
  }, [pathname, router]);

  useEffect(() => {
    redirecting.current = false;
  }, [expiresAt]);

  // Navigasi SPA mengubah pathname tanpa me-render ulang layout induk.
  useEffect(() => {
    if (!isSessionExpired(expiresAt)) return;
    endSession();
  }, [pathname, expiresAt, isAuthenticated, endSession]);

  useEffect(() => {
    const check = () => {
      if (isSessionExpired(useAuthStore.getState().expiresAt)) endSession();
    };
    const onExpired = () => endSession();

    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    const interval = window.setInterval(check, 30_000);

    // Sinyal bisa lebih dulu terjadi sebelum komponen ini sempat mount.
    if (consumeSessionExpiredSignal()) onExpired();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [endSession]);

  return null;
}
