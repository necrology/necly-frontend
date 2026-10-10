import { BackToTop } from "@/components/back-to-top";
import { ReportIssueButton } from "@/components/report-issue-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main-content">{children}</main>
      <SiteFooter />
      <BackToTop />
      {/* Poin 12: pintasan laporan kendala tersedia di setiap halaman. */}
      <ReportIssueButton />
    </>
  );
}
