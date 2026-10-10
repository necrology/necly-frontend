import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) => readFileSync(join(process.cwd(), ...segments), "utf8");

const guide = read("src", "data", "guide.ts");
const guidePage = read("src", "app", "(site)", "cara-berlangganan", "page.tsx");
const faqPage = read("src", "app", "(site)", "faq", "page.tsx");
const homeSections = read("src", "components", "commerce-home-sections.tsx");
const siteLayout = read("src", "app", "(site)", "layout.tsx");
const reportButton = read("src", "components", "report-issue-button.tsx");
const css = read("src", "app", "globals.css");

describe("QA fixes on static pages, footer entry, and report shortcut", () => {
  it('memakai nama usaha lengkap "Panduan Necly Services" (baris 51)', () => {
    expect(guidePage).toContain('<span className="eyebrow">Panduan Necly Services</span>');
    expect(guidePage).toContain("<header><p>Panduan Necly Services</p>");
    expect(guidePage).not.toContain("Panduan Necly<");
  });

  it("ikon FAQ memakai page-down, bukan tanda plus (baris 52)", () => {
    expect(faqPage).toContain('<ChevronDown className="faq-chevron" size={20} aria-hidden="true" />');
    expect(faqPage).not.toContain('>+</span>');
    expect(css).toContain(".faq-list details[open] summary .faq-chevron { transform: rotate(180deg); }");
  });

  it('memberi tombol "Layanan" dan "Laporan Kendala" pada poin FAQ terkait (baris 53 & 54)', () => {
    expect(guide).toContain('action: { label: "Layanan", href: "/products" }');
    expect(guide).toContain('action: { label: "Laporan Kendala", href: "/laporan-kendala" }');
    expect(faqPage).toContain('{action && <Link className="faq-action" href={action.href}>{action.label}</Link>}');
    expect(homeSections).toContain('{action && <Link className="faq-action" href={action.href}>{action.label}</Link>}');
    expect(css).toContain(".faq-list .faq-action {");
  });

  it("menyediakan pintasan laporan kendala di setiap halaman, bisa ditutup, dengan opsi WA dan Email (poin 12)", () => {
    expect(siteLayout).toContain("<ReportIssueButton />");
    expect(reportButton).toContain('href={whatsappLink("Halo Necly Services, saya ingin melaporkan kendala.")}');
    expect(reportButton).toContain("href={`mailto:${contact.email}`}");
    expect(reportButton).toContain("onClick={() => setOpen(false)}");
    expect(css).toContain(".report-issue { position: fixed; left: 16px;");
  });

  it('memperbesar nama field dan meninggikan shape "Kategori kendala" (poin 15)', () => {
    expect(css).toContain(".issue-page .issue-form .label { font-size: 14px; }");
    expect(css).toContain(".issue-page .issue-form .select { min-height: 58px; padding-block: 16px; }");
  });

  it("membangun ulang footer: nama lengkap, sosmed, kategori, kontak, jam operasional (poin 16)", () => {
    const footer = read("src", "components", "site-footer.tsx");
    expect(footer).not.toContain("<strong>NS</strong>");
    expect(footer).toContain("<strong>Necly Service</strong>");
    expect(footer).toContain("Kami hadir sebagai layanan digital yang menyediakan berbagai pilihan akun sharing");
    for (const heading of ["Sosmed", "Kategori Produk", "Hubungi Kami", "Jam Operasional"]) expect(footer).toContain(`<h2>${heading}</h2>`);
    expect(footer).not.toContain("InstagramIcon");
    expect(footer).not.toContain("FacebookIcon");
    expect(footer).toContain('["Testimoni", "/testimoni"]');
    expect(footer).toContain('["Tentang Kami", "/about"]');
    expect(css).toContain(".commerce-footer-socials a { display: inline-flex; align-items: center; gap: 8px;");
  });

  it("menyajikan testimoni dari endpoint, bukan ulasan karangan (poin 16)", () => {
    const testimoni = read("src", "app", "(site)", "testimoni", "page.tsx");
    const list = read("src", "components", "testimonials-client.tsx");
    // The page itself stays a server component: it renders the client list,
    // which is the only place that talks to the API.
    expect(testimoni).toContain("<TestimonialsClient />");
    expect(list).toContain("testimonialsApi");
    expect(read("src", "lib", "api.ts")).toContain('`/public/testimonials${query ? `?${query}` : ""}`');
    // No seeded or hardcoded reviews: the empty state is the only fallback.
    expect(list).not.toContain("@/data/seed");
    expect(list).toContain("Belum ada testimoni yang ditampilkan");
    expect(css).toContain(".testimonials-empty { display: grid; justify-items: center;");
    expect(css).toContain(".testimonials-empty-icon {");
    expect(css).toContain(".testimonial-card {");
  });
});
