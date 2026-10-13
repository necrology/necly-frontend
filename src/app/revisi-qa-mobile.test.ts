import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Kunci regresi untuk putaran revisi QA (kolom STATUS DEVELOPMENT = REVISI / ON PROGRESS).
// Setiap pengecekan menunjuk baris di dokumen QA "CATATAN TESTING_SHARING APP".
const read = (...segments: string[]) => readFileSync(join(process.cwd(), ...segments), "utf8");

const css = read("src", "app", "globals.css");
const storefront = read("src", "app", "storefront-fixes.css");
const home = read("src", "app", "(site)", "page.tsx");
const detail = read("src", "components", "product-detail-client.tsx");
const checkout = read("src", "components", "checkout-commerce-client.tsx");
const issue = read("src", "app", "(site)", "laporan-kendala", "page.tsx");
const login = read("src", "app", "(auth)", "login", "page.tsx");
const forgot = read("src", "app", "(auth)", "forgot-password", "page.tsx");
const guide = read("src", "app", "(site)", "cara-berlangganan", "page.tsx");
const reportButton = read("src", "components", "report-issue-button.tsx");

describe("revisi QA putaran kedua", () => {
  it("baris 9: ikon panah dihapus, teks CTA putih, badge 'Lebih Hemat' dihapus", () => {
    expect(home).not.toContain("Lebih Hemat<br />");
    expect(home).toContain('<Link className="commerce-hero-cta" href="/products">Lihat Layanan</Link>');
    expect(css).toContain(".commerce-hero-cta { min-height: 54px; display: inline-flex; align-items: center; gap: 11px; margin-top: 28px; border-radius: 999px; padding: 0 28px; color: #ffffff; background: var(--commerce-gold);");
    expect(css).toContain(".commerce-hero-cta { width: fit-content; margin: 22px auto 0; padding: 0 24px; justify-content: center; background: var(--commerce-gold); border: 0; color: #fff; }");
  });

  it("baris 16: titik dua keluar dari alur supaya label center di atas kotaknya", () => {
    expect(css).toContain(".commerce-time-digits i { position: absolute; left: calc(100% + 2px);");
    expect(css).toContain(".commerce-time-values { display: flex; align-items: flex-start; gap: 14px; }");
  });

  it("baris 23: paragraf footer rata kanan-kiri dan tombol lapor disembunyikan di footer", () => {
    expect(css).toContain(".commerce-footer-brand p { margin: 6px 0 0; color: #c3ccfb; font-size: 11px; line-height: 1.65; text-align: justify; }");
    expect(reportButton).toContain("nearFooter && !open ? \"is-hidden\" : \"\"");
    expect(css).toContain(".report-issue.is-hidden { opacity: 0; visibility: hidden;");
  });

  it("baris 33: logo brand hanya dirender sekali di halaman detail", () => {
    expect(detail).not.toContain("commerce-product-image-brand");
    expect(detail).toContain("<ProductBrand product={product} />");
    expect(detail.match(/<ProductBrand/g)).toHaveLength(1);
    expect(detail).toContain('className="commerce-summary-product commerce-summary-product--text"');
  });

  it("baris 35: nominal dan badge stok tidak lagi ditimpa warna abu-abu induknya", () => {
    expect(css).toContain(".commerce-product-information > p:not(.commerce-detail-price):not(.commerce-stock-ready)");
    expect(css).toContain(".commerce-product-information > .commerce-detail-price { color: #4c1ef9;");
  });

  it("baris 36: catatan kendala disejajarkan, diberi bintang, berwarna merah, dan rata tengah", () => {
    expect(detail).toContain('className="commerce-accordion-note"');
    expect(css).toContain(".commerce-accordion-copy p.commerce-accordion-note { color: #c0261d; text-align: center; }");
  });

  it("baris 40: tombol Ubah diperbesar", () => {
    expect(css).toContain(".commerce-summary-line > span button { min-height: 26px;");
  });

  it("baris 43: breadcrumb diperbesar, termasuk di mobile", () => {
    expect(css).toContain("font-size: 16px; font-weight: 600; }");
    expect(css).toContain(".commerce-breadcrumbs { font-size: 16px; gap: 11px; }");
  });

  it("baris 47: durasi checkout mengikuti pilihan di halaman detail", () => {
    expect(checkout).toContain("const durationFromCart = useMemo(");
    expect(checkout).toContain("setDurationOverride(index)");
    expect(checkout).not.toContain("const [duration, setDuration] = useState(0);");
  });

  it("baris 50: warning bank/retail memakai tampilan warning detail pesanan", () => {
    expect(checkout).toContain('className="commerce-field-warning commerce-payment-note"');
    expect(checkout).toContain("Pilih durasi minimal 6 bulan untuk metode bank/alfa.");
    expect(checkout).toContain('className="commerce-field-warning commerce-checkout-warning"');
    expect(css).toContain(".commerce-checkout-summary .commerce-checkout-warning { margin: 22px 0 0; }");
  });

  it("baris 52: animasi di halaman Layanan diperbesar", () => {
    expect(storefront).toContain(".commerce-catalog-hero-art { width: min(100%, 310px);");
    expect(css).toContain(".commerce-catalog-hero-art { max-width: 340px; }");
  });

  it("baris 59: field wajib di laporan kendala diberi bintang merah", () => {
    const required = issue.match(/commerce-required/g) ?? [];
    // Nama, Email, Nomor pesanan, Kategori kendala, Jelaskan kendala.
    expect(required).toHaveLength(5);
  });

  it("baris 60: tombol Kembali ke beranda tampil putih lalu jadi biru saat disorot", () => {
    // Layar "Laporan Diterima" dan tautan di dalam form sama-sama jadi tombol putih.
    expect(issue).toContain('className="button issue-home-button"');
    expect(issue).toContain('className="button issue-back-button"');
    expect(css).toContain(".issue-success .issue-home-button { width: fit-content; color: #4c1ef9; background: #fff;");
    expect(css).toContain(".issue-success .issue-home-button:hover, .issue-success .issue-home-button:focus-visible { color: #fff; background: #4c1ef9;");
    expect(css).toContain(".issue-page .issue-back-button:hover, .issue-page .issue-back-button:focus-visible { color: #fff; background: #4c1ef9;");
  });

  it("baris 66: ajakan daftar di halaman login diperbesar", () => {
    expect(login).toContain('className="muted auth-register-prompt"');
    expect(css).toContain(".auth-register-prompt { margin: 0 !important; text-align: center; font-size: 14px !important; }");
  });

  it("baris 61 & 62: deskripsi dipecah dua baris, aside dibuat bold tanpa panah", () => {
    expect(guide).toContain("memilih layanan-<br />sampai akses pesanan Anda diproses.");
    expect(guide).not.toContain("Lihat Layanan <ArrowRight");
    expect(css).toContain(".guide-aside h2 { margin: 0 0 10px; color: #302151; font-size: 18px; font-weight: 800; }");
  });

  it("baris 63 & 64: sapaan login baru dan subtitle diberi jarak dari judul", () => {
    expect(login).toContain("Hi, Senang Bertemu Kembali");
    expect(css).toContain(".auth-form-login .auth-login-intro p { margin-top: clamp(14px, 2.2vh, 22px) !important; }");
  });

  it("baris 65: tautan lupa kata sandi dibuat jelas bisa diklik", () => {
    expect(login).toContain('className="button button-ghost button-sm auth-forgot-link" href="/forgot-password"');
  });

  it("baris 67: kegagalan dibedakan antara jaringan dan status HTTP", () => {
    expect(forgot).toContain("function failureMessage(error: unknown)");
    expect(forgot).toContain("if (error.status === 429)");
    expect(forgot).toContain("await authApi.forgotPassword(nextEmail)");
    expect(forgot).not.toContain("sendResetLink");
  });
});
