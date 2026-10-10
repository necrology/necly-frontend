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
});
