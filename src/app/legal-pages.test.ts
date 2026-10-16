import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Google menautkan halaman ini sebagai "privacy policy" dan "terms of service"
// pada layar persetujuan OAuth, jadi keduanya harus tetap ada, dapat dibaca
// publik, dan memuat hal-hal yang wajib diungkapkan.
const read = (...segments: string[]) => readFileSync(join(process.cwd(), ...segments), "utf8");

const privacy = read("src", "app", "(site)", "kebijakan-privasi", "page.tsx");
const terms = read("src", "app", "(site)", "syarat-ketentuan", "page.tsx");
const footer = read("src", "components", "site-footer.tsx");
const register = read("src", "app", "(auth)", "register", "page.tsx");
const checkout = read("src", "components", "checkout-commerce-client.tsx");
const css = read("src", "app", "globals.css");

describe("halaman kebijakan privasi dan syarat ketentuan", () => {
  it("keduanya halaman publik dengan judul sendiri", () => {
    expect(privacy).toContain('title: "Kebijakan Privasi"');
    expect(terms).toContain('title: "Syarat dan Ketentuan"');
    expect(privacy).toContain('className="container legal-page"');
    expect(terms).toContain('className="container legal-page"');
    expect(css).toContain(".legal-page { width: min(calc(100% - 40px), 820px);");
  });

  it("kebijakan privasi mengungkapkan hal yang diminta Google", () => {
    // Data yang dikumpulkan, termasuk data yang datang dari Google.
    expect(privacy).toContain("Data akun");
    expect(privacy).toContain("Masuk dengan Google");
    expect(privacy).toContain("Data pesanan dan pembayaran");
    expect(privacy).toContain("Data sesi dan perangkat");
    // Pemakaian, pihak ketiga, masa simpan, dan cara menghubungi.
    expect(privacy).toContain("Untuk apa data itu dipakai");
    expect(privacy).toContain("Pihak ketiga yang menerima data");
    expect(privacy).toContain("Berapa lama data disimpan");
    expect(privacy).toContain("Hubungi kami");
    // Cookie sesi dan pernyataan bahwa tidak ada cookie iklan.
    expect(privacy).toContain("refresh_token");
    expect(privacy).toContain("tidak</strong> memakai cookie periklanan");
  });

  it("syarat ketentuan mencakup bagian-bagian pokok layanan", () => {
    expect(terms).toContain("Akun");
    expect(terms).toContain("Pesanan dan pembayaran");
    expect(terms).toContain("Masa aktif dan perpanjangan");
    expect(terms).toContain("Kewajiban Anda");
    expect(terms).toContain("Kendala dan pengembalian dana");
    expect(terms).toContain("Hukum yang berlaku");
    // Penting: Necly bukan afiliasi penyedia layanan yang dijual.
    expect(terms).toContain("bukan afiliasi");
    // Dan tidak pernah meminta kata sandi akun pribadi pelanggan.
    expect(terms).toContain("tidak pernah</strong> meminta kata sandi");
  });

  it("keduanya dapat ditemukan dari footer dan dari form yang memintanya", () => {
    expect(footer).toContain('["Kebijakan Privasi", "/kebijakan-privasi"]');
    expect(footer).toContain('["Syarat & Ketentuan", "/syarat-ketentuan"]');
    // Form Daftar dan Checkout meminta persetujuan, jadi dokumennya harus tertaut.
    expect(register).toContain('href="/syarat-ketentuan"');
    expect(register).toContain('href="/kebijakan-privasi"');
    expect(checkout).toContain('href="/syarat-ketentuan"');
    expect(checkout).toContain('href="/kebijakan-privasi"');
  });
});
