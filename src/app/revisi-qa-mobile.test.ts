import { existsSync, readFileSync } from "node:fs";
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
const cartStore = read("src", "stores", "cart-store.ts");
const about = read("src", "app", "(site)", "about", "page.tsx");
const header = read("src", "components", "site-header.tsx");
const account = read("src", "app", "(site)", "akun", "page.tsx");
const passwordField = read("src", "components", "password-field.tsx");
const sessionGuard = read("src", "components", "session-expiry-guard.tsx");
const rootLayout = read("src", "app", "layout.tsx");
const apiSource = read("src", "lib", "api.ts");
const productMapper = read("src", "lib", "product-mapper.ts");
const productBrand = read("src", "components", "product-brand.tsx");
const brandSource = read("src", "lib", "commerce-product.ts");
const authValidation = read("src", "lib", "auth-validation.ts");
const registerPage = read("src", "app", "(auth)", "register", "page.tsx");
const cartPage = read("src", "app", "(site)", "cart", "page.tsx");
const cartClient = read("src", "app", "(site)", "cart", "cart-client.tsx");
const authLayout = read("src", "app", "(auth)", "layout.tsx");
const terms = read("src", "app", "(site)", "syarat-ketentuan", "page.tsx");
const serviceVisual = read("src", "components", "service-visual.tsx");
const seed = read("src", "data", "seed.ts");
const inventoryPage = read("src", "app", "dashboard", "inventory", "page.tsx");

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
    // Halaman checkout membangun pesanan dari keranjang, jadi durasi, ringkasan,
    // dan totalnya tidak lagi dihitung ulang dari data contoh di klien.
    expect(checkout).toContain("const subtotal = useMemo(() => items.reduce(");
    expect(checkout).toContain("const months = useMemo(");
    expect(checkout).not.toContain("UNIQUE_CODE");
    expect(checkout).toContain("Potongan voucher dihitung saat pesanan dibuat.");
    expect(cartStore).toContain("entry.id === item.id");
    expect(cartStore).toContain("return [{ ...item, quantity: 1 }]");
    expect(cartStore).toContain("if (selectionReplaced) return []");
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

  it("baris 58: animasi ceklis berada di sebelah teks Laporan Diterima", () => {
    expect(issue).toContain('className="issue-success-heading"');
    expect(issue).toMatch(/issue-success-heading[\s\S]*issue-check[\s\S]*<h2>Laporan Diterima<\/h2>/);
    expect(css).toContain(".issue-success-heading { display: flex; align-items: center; gap: 12px; }");
  });

  it("baris 60: tombol Beranda tampil putih lalu jadi biru saat disorot", () => {
    // Layar "Laporan Diterima" dan tautan di dalam form sama-sama jadi tombol putih.
    expect(issue).toContain('className="button issue-home-button"');
    expect(issue).toContain('className="button issue-back-button"');
    expect(issue.match(/> Beranda<\/Link>/g)).toHaveLength(2);
    expect(issue).not.toContain("Kembali ke beranda</Link>");
    expect(css).toContain(".issue-success .issue-home-button { width: fit-content; color: #4c1ef9; background: #fff;");
    expect(css).toContain(".issue-success .issue-home-button:hover, .issue-success .issue-home-button:focus-visible { color: #fff; background: #4c1ef9;");
    expect(css).toContain(".issue-page .issue-back-button:hover, .issue-page .issue-back-button:focus-visible { color: #fff; background: #4c1ef9;");
    expect(issue).toContain('className="issue-form-actions"');
    expect(css).toContain(".issue-form-actions { display: grid; gap: 14px; margin-top: 22px; }");
    expect(css).toContain(".issue-form-actions .button { width: 100%;");
  });

  it("baris 68: jarak vertikal halaman Tentang dirapatkan di desktop dan mobile", () => {
    expect(about).toContain('className="section section-rule about-section"');
    expect(about).toContain("about-principles-section");
    expect(css).toContain(".about-section { padding-block: 40px; }");
    expect(css).toContain(".about-principles-section { padding-top: 8px; }");
    expect(css).toContain(".about-grid { grid-template-columns: 1fr; gap: 12px; }");
  });

  it("baris 71: teks akun dan keluar di menu mobile berwarna putih", () => {
    expect(header.match(/commerce-mobile-account-action/g)).toHaveLength(2);
    expect(css).toContain(".commerce-mobile-account-action { color: #fff; }");
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
    expect(login).toContain('className="eyebrow auth-login-greeting">Hi, Senang Bertemu Kembali</span>');
    expect(css).toContain(".auth-form-login .auth-login-greeting { font-size: clamp(13px, 1.5vw, 15px); line-height: 1.4; }");
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

  it("baris 75-78: ubah kata sandi punya bintang wajib, tautan lupa sandi, dan logout setelah berhasil", () => {
    expect(passwordField).toContain('className="field-required"');
    expect(passwordField).toContain("aria-required");
    expect(account.match(/required \/>/g)).toHaveLength(3);
    expect(account).toContain("Lupa sandi saat ini?");
    expect(account).toContain("authApi.logout()");
    expect(account).toContain('router.replace("/login?passwordChanged=1")');
    expect(account).toContain("Masukkan kata sandi Anda saat ini untuk mengonfirmasi. Setelah tersimpan, semua perangkat lain akan keluar otomatis.");
  });

  it("baris 81-82: sesi kedaluwarsa diakhiri saat navigasi dan tidak dipulihkan", () => {
    expect(apiSource).toContain("isSessionExpired");
    expect(apiSource).toContain("necly-auth-expires-at");
    expect(apiSource).toContain("sessionExpiryFrom");
    expect(apiSource).toContain('apiRequest<{ message: string }>("/auth/logout"');
    expect(sessionGuard).toContain("usePathname");
    expect(sessionGuard).toContain('router.replace("/login?expired=1")');
    expect(rootLayout).toContain("<SessionExpiryGuard />");
  });

  it("baris 83: tombol Pesanan saya berwarna kuning seperti Lapor Kendala", () => {
    expect(css).toContain(".account-orders-link { width: fit-content; color: #2a2140; background: #fcbd50;");
  });

  it("baris 84: Ingat saya menyimpan email dan memakai autocomplete username", () => {
    expect(login).toContain('autoComplete="username"');
    expect(login).toContain("necly-remember-email");
    expect(login).toContain("checked={remember}");
  });

  it("baris 86: tombol Log In di menu mobile berwarna putih", () => {
    expect(header).toContain("commerce-mobile-login commerce-mobile-login-action");
    expect(css).toContain(".commerce-mobile-login-action { color: #fff; }");
  });

  it("baris 87: jarak animasi hero mobile dirapatkan", () => {
    expect(css).toContain(".commerce-home-hero-inner { grid-template-columns: 1fr; gap: 12px; text-align: center; }");
    expect(css).toContain(".commerce-home-hero-art { max-width: 400px; margin-inline: auto; margin-top: -4px; }");
  });

  it("baris 88-89: label slot internal dibersihkan dari judul dan deskripsi", () => {
    expect(productMapper).toContain("cleanProductName");
    expect(productMapper).toContain("Akun langganan tersedia untuk dipakai bersama");
    expect(productMapper).not.toContain("Slot akun langganan untuk dipakai bersama");
    expect(brandSource).toContain('tone: "canva"');
    expect(brandSource).toContain('tone: "googleone"');
    expect(brandSource).toContain('tone: "dropbox"');
  });

  it("baris 90: logo Canva, Google One, dan Dropbox tersedia", () => {
    expect(productBrand).toContain("/design-assets/logo-canva.svg");
    expect(productBrand).toContain("/design-assets/logo-google-one.svg");
    expect(productBrand).toContain("/design-assets/logo-dropbox.svg");
    for (const logo of ["logo-canva.svg", "logo-google-one.svg", "logo-dropbox.svg"]) {
      expect(existsSync(join(process.cwd(), "public", "design-assets", logo))).toBe(true);
    }
  });

  it("placeholder dan pesan kata sandi tidak lagi memakai istilah byte", () => {
    expect(authValidation).toContain("Kata sandi minimal 10 karakter");
    expect(authValidation).not.toContain("10–72 byte");
    expect(passwordField).toContain("Minimal 10 karakter");
    for (const source of [login, registerPage, account]) {
      expect(source).not.toContain("10–72 byte");
    }
  });

  it("kata slot sudah hilang dari halaman pelanggan dan label dashboard utama", () => {
    expect(cartPage).not.toMatch(/slot/i);
    expect(cartClient).not.toMatch(/slot/i);
    expect(authLayout).not.toMatch(/slot/i);
    expect(terms).not.toMatch(/slot/i);
    expect(serviceVisual).not.toMatch(/slot/i);
    expect(productMapper).toContain("jumlah akses yang tersedia");
    expect(seed).not.toContain("StreamFlix Slot Keluarga");
    expect(seed).not.toContain("MusicFlow Slot Keluarga");
    expect(seed).not.toContain("Readly Slot Keluarga");
    expect(inventoryPage).toContain('label="Akses tersedia"');
    expect(inventoryPage).toContain("Tambah akses akun");
    expect(inventoryPage).not.toContain("Konfirmasi tambah slot");
  });

  it("email punya jalur kirim ulang dan kontak admin saat gagal", () => {
    expect(forgot).toContain("mailto:necly.services@gmail.com");
    expect(registerPage).toContain("resendVerification");
    expect(registerPage).toContain("mailto:necly.services@gmail.com");
    expect(issue).toContain("mailto:necly.services@gmail.com");
    expect(login).toContain("mailto:necly.services@gmail.com");
  });
});
