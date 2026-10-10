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
    expect(css).toContain(".commerce-breadcrumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-bottom: 18px; color: var(--commerce-muted); font-size: 13px;");
  });

  it("samakan ukuran ilustrasi checkout dengan halaman detail order (baris 44)", () => {
    expect(css).toContain(".commerce-checkout-hero-inner { grid-template-columns: minmax(0, 1fr) 360px; }");
    expect(css).toContain(".commerce-checkout-hero img { max-width: none; width: 100%; justify-self: stretch; }");
  });

  it('voucher hanya menampilkan "Kode Voucher Tidak dikenali" berwarna merah (baris 45)', () => {
    expect(client).toContain('"Kode Voucher Tidak dikenali."');
    expect(client).not.toContain("Coba HEMAT10");
    expect(css).toContain(".commerce-voucher-message.is-error { color: #c0261d; }");
  });

  it("warning bank/retail hanya tampil saat metode itu yang dipilih (baris 46)", () => {
    expect(client).toContain("{MANUAL_PAYMENTS.includes(payment) && <div className=\"commerce-payment-note\">");
  });

  it("peringatan durasi minimal 6 bulan dibuat merah dan berjarak dari tombol Bayar (baris 49)", () => {
    expect(client).toContain('className="commerce-checkout-warning"');
    expect(client).toContain("Pilih durasi minimal 6 bulan untuk metode {payment}.");
    expect(css).toContain(".commerce-checkout-warning { display: flex; align-items: center; gap: 8px; margin: 14px 0 0;");
  });

  it('tombol "Hubungi Admin" diganti "Lapor Kendala" + alamat email (baris 50)', () => {
    expect(client).not.toContain("wa.me/6282115297376");
    expect(client).toContain('<Link className="commerce-admin-button" href="/laporan-kendala"><LifeBuoy size={22} />Lapor Kendala</Link>');
    expect(client).toContain("href={`mailto:${contact.email}`}");
  });

  it('isi card "Manfaat Layanan" memakai copy dari dokumen QA (baris 37)', () => {
    expect(detail).toContain("Dengan berlangganan di Necly Service, kamu bisa menikmati harga lebih hemat, privasi yang terjaga, layanan yang responsif, akses yang terpercaya, berbagai pilihan pembayaran, serta pengingat pembayaran agar tidak terlewat");
    expect(detail).toContain('title === "Manfaat Layanan" ? serviceBenefitsCopy');
  });
});
