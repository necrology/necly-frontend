import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";
import Loading from "./loading";
import NotFound from "./not-found";

describe("teks status aplikasi", () => {
  it("menampilkan halaman kesalahan dalam bahasa Indonesia", () => {
    render(<ErrorPage error={new Error("uji")} reset={vi.fn()} />);

    expect(screen.getByText("Halaman mengalami gangguan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
  });

  it("menampilkan halaman tidak ditemukan dalam bahasa Indonesia", () => {
    render(<NotFound />);

    expect(screen.getByText("404 · Halaman tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat katalog" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "Kembali ke beranda" })).toHaveAttribute("href", "/");
  });

  it("memberi label pemuatan berbahasa Indonesia", () => {
    render(<Loading />);

    expect(screen.getByRole("main", { name: "Memuat halaman" })).toBeInTheDocument();
  });
});
