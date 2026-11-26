import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) => readFileSync(join(process.cwd(), ...segments), "utf8");

const page = read("src", "app", "(site)", "checkout", "page.tsx");
const client = read("src", "components", "checkout-commerce-client.tsx");
const detail = read("src", "components", "product-detail-client.tsx");
const css = read("src", "app", "globals.css");

describe("QA mobile fixes on checkout and product detail", () => {
  it("perbesar icon, panah, dan teks breadcrumb checkout (baris 43)", () => {
    expect(page).toContain('className="commerce-breadcrumbs"');
    expect(page).toContain("<House size={17}");
    // Revisi QA terbaru: ukurannya dinaikkan lagi dari 15px ke 16px.
    expect(css).toContain(".commerce-breadcrumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 11px; margin-bottom: 18px; color: var(--commerce-muted); font-size: 16px;");
  });

  it("hero checkout tidak lagi memuat gambar dummy dan teksnya melebar penuh (baris 44, NEC-234/247)", () => {
    // Gambar dummy /illustrations/product-workspace.svg dihapus atas permintaan pemilik
    // produk; hero harus satu kolom agar tidak menyisakan kolom kosong selebar 300-360px.
    expect(page).not.toContain("product-workspace.svg");
    expect(page).not.toContain('from "next/image"');
    expect(css).toContain(".commerce-checkout-hero-inner { display: grid; grid-template-columns: minmax(0, 1fr); gap: 30px; align-items: center; }");
    // Aturan img yang sudah tidak punya elemen sasaran tidak boleh tertinggal.
    expect(css).not.toContain(".commerce-checkout-hero img {");
  });

  it('voucher hanya menampilkan "Kode Voucher Tidak dikenali" berwarna merah (baris 45)', () => {
    expect(client).toContain('"Kode Voucher Tidak dikenali"');
    expect(client).not.toContain("Coba HEMAT10");
    expect(css).toContain(".commerce-voucher-message.is-error { color: #c0261d; }");
  });

  it("warning bank/retail hanya tampil saat metode itu yang dipilih (baris 46)", () => {
    expect(client).toContain('{MANUAL_PAYMENTS.includes(payment) && <div className="commerce-field-warning commerce-payment-note" role="alert">');
  });

  it("peringatan durasi minimal 6 bulan memakai warning detail dan berjarak dari tombol Bayar (baris 50)", () => {
    expect(client).toContain('<AlertCircle size={15} /><p>Pilih durasi minimal 6 bulan untuk metode bank/alfa.</p>');
    expect(css).toContain(".commerce-checkout-section .commerce-payment-note { margin-top: 14px; }");
    expect(css).not.toContain("background: #f1ecff;");
    expect(client).toContain('className="commerce-field-warning commerce-checkout-warning"');
    expect(client).toContain("Pilih durasi minimal 6 bulan untuk metode {payment}.");
    expect(css).toContain(".commerce-field-warning { display: flex; align-items: center; gap: 7px;");
    expect(css).toContain(".commerce-checkout-summary .commerce-checkout-warning { margin: 22px 0 0; }");
  });

  it('tombol "Hubungi Admin" diganti "Lapor Kendala" + alamat email (baris 51)', () => {
    expect(client).not.toContain("wa.me/6282115297376");
    expect(client).toContain('<Link className="commerce-admin-button" href="/laporan-kendala"><LifeBuoy size={22} />Lapor Kendala</Link>');
    expect(client).toContain("href={`mailto:${contact.email}`}");
  });

  it('isi card "Manfaat Layanan" memakai copy dari dokumen QA (baris 37)', () => {
    expect(detail).toContain("Dengan berlangganan di Necly Service, kamu bisa menikmati harga lebih hemat, privasi yang terjaga, layanan yang responsif, akses yang terpercaya, berbagai pilihan pembayaran, serta pengingat pembayaran agar tidak terlewat");
    expect(detail).toContain('title === "Manfaat Layanan" ? serviceBenefitsCopy');
  });
});
