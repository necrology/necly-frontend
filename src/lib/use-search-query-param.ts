"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

/**
 * Mengisi kolom pencarian dari `?search=` agar tautan hasil pencarian global
 * langsung membuka daftar yang sudah terfilter. `window.location` dipakai
 * (bukan `useSearchParams`) supaya halaman dashboard tetap bisa diprerender
 * tanpa boundary Suspense tambahan.
 */
export function useSearchQueryParam(
  setQuery: Dispatch<SetStateAction<string>>,
  param = "search",
) {
  useEffect(() => {
    const sync = () => {
      const value = new URLSearchParams(window.location.search).get(param);
      if (value !== null) setQuery(value);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [param, setQuery]);
}
