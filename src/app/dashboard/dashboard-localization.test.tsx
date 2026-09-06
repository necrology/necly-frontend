import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard overview localization", () => {
  const readSource = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
  const source = readSource("src/app/dashboard/page.tsx");
  const productsSource = readSource("src/app/dashboard/products/page.tsx");
  const layoutSource = readSource("src/app/dashboard/layout.tsx");
  const pageSources = {
    produk: productsSource,
    pesanan: readSource("src/app/dashboard/orders/page.tsx"),
    pembayaran: readSource("src/app/dashboard/payments/page.tsx"),
    pelanggan: readSource("src/app/dashboard/customers/page.tsx"),
    inventaris: readSource("src/app/dashboard/inventory/page.tsx"),
    voucher: readSource("src/app/dashboard/vouchers/page.tsx"),
    laporan: readSource("src/app/dashboard/reports/page.tsx"),
    audit: readSource("src/app/dashboard/audit-log/page.tsx"),
    notifikasi: readSource("src/app/dashboard/notifications/page.tsx"),
  };

  it("uses Indonesian operational headings and amounts", () => {
    for (const label of ["Ringkasan operasional", "Pendapatan kotor", "Pesanan baru", "Aktivasi berjalan", "Slot tersedia", "Pesanan terbaru"]) {
      expect(source).toContain(label);
    }
    // Check for Indonesian locale formatting (toLocaleString with id-ID)
    expect(source).toContain("toLocaleString(\"id-ID\"");
    expect(source).not.toContain("Operations overview");
  });

  it("uses a seven-day range that matches the seven-day chart", () => {
    expect(source).toContain("31 Agu–6 Sep");
    expect(source).toContain("7 hari terakhir");
  });

  it("tidak menampilkan peringkat, ulasan, atau testimoni di pengelolaan produk", () => {
    expect(productsSource).not.toMatch(/Peringkat|Rating|Ulasan|Review|Testimoni|Testimonial/i);
    expect(productsSource).not.toContain("product.rating");
    expect(productsSource).not.toContain("product.reviews");
    expect(productsSource).not.toContain("product.testimonials");
  });

  it("menggunakan judul metadata admin berbahasa Indonesia", () => {
    expect(layoutSource).toContain('default: "Dasbor"');
    expect(layoutSource).toContain('template: "%s | Admin Necly"');
    expect(layoutSource).not.toContain("Necly Services Admin");
  });

  it("memuat data contoh hanya pada mode demo", () => {
    expect(source).toContain("const displayData = DEMO_MODE ? demoData : data");
    expect(source).not.toContain("data ?? demoData");
    for (const [page, pageSource] of Object.entries(pageSources)) {
      expect(pageSource, page).not.toMatch(/DEMO_MODE \|\| !api[A-Za-z]+/);
    }
    expect(pageSources.pembayaran).toContain("DEMO_MODE ? payments : apiPayments ?? []");
    expect(pageSources.inventaris).toContain("DEMO_MODE ? services : []");
  });

  it("menyediakan keadaan kosong berbahasa Indonesia untuk tabel operasional", () => {
    const emptyCopy: Record<keyof typeof pageSources, string> = {
      produk: "Belum ada produk akun sharing.",
      pesanan: "Belum ada pesanan.",
      pembayaran: "Belum ada pembayaran.",
      pelanggan: "Belum ada pelanggan.",
      inventaris: "Belum ada akun atau slot langganan.",
      voucher: "Belum ada voucher.",
      laporan: "Belum ada data laporan.",
      audit: "Belum ada aktivitas tercatat.",
      notifikasi: "Belum ada notifikasi.",
    };
    for (const [page, copy] of Object.entries(emptyCopy)) {
      expect(pageSources[page as keyof typeof pageSources], page).toContain(copy);
    }
  });

  it("tidak memuat metrik sosial atau penjualan contoh di luar mode demo", () => {
    expect(pageSources.pelanggan).not.toContain('value="1.284"');
    expect(pageSources.pelanggan).not.toContain('value="38%"');
    expect(pageSources.pelanggan).not.toContain('value="19"');
    expect(pageSources.pembayaran).not.toContain('value="Rp4,86jt"');
    expect(pageSources.laporan).not.toContain('value="Rp83,6jt"');
  });

  it("menggunakan copy operasional akun sharing yang jelas", () => {
    expect(source).toContain("akun langganan sharing");
    expect(productsSource).toContain("slot anggota");
    expect(pageSources.inventaris).toContain("akun langganan");
    expect(pageSources.pesanan).toContain("aktivasi slot anggota");
  });
});
