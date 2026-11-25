import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/link")>();
  return {
    ...actual,
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
      <a href={href} {...props}>{children}</a>
    ),
  };
});

vi.mock("@/data/contact", () => ({
  contact: { whatsappLabel: "+62 899-9228-241", email: "necly.services@gmail.com" },
  whatsappLink: (msg: string) => `https://wa.me/628999228241?text=${encodeURIComponent(msg)}`,
}));

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

import { ReportIssueButton } from "./report-issue-button";

describe("ReportIssueButton (baris 132)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("menampilkan tombol close (X) pada trigger button dan bisa menyembunyikan tombol (baris 132)", () => {
    render(<ReportIssueButton />);

    // Tombol trigger terlihat
    const triggerButton = screen.getByRole("button", { name: /Buka laporan kendala/i });
    expect(triggerButton).toBeInTheDocument();

    // Tombol close (X) ada di sebelah trigger button
    const closeButton = screen.getByRole("button", { name: /Sembunyikan tombol laporan kendala selama 5 menit/i });
    expect(closeButton).toBeInTheDocument();

    // Klik tombol close
    fireEvent.click(closeButton);

    // Tombol trigger hilang (userHidden = true)
    expect(screen.queryByRole("button", { name: /Buka laporan kendala/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sembunyikan tombol laporan kendala selama 5 menit/i })).not.toBeInTheDocument();

    // localStorage diset dengan waktu sekarang
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "necly-report-issue-hidden-at",
      expect.any(String)
    );
  });

  it("menyimpan waktu tutup ke localStorage dan timer dibuat saat klik close (baris 132)", () => {
    render(<ReportIssueButton />);

    const closeButton = screen.getByRole("button", { name: /Sembunyikan tombol laporan kendala selama 5 menit/i });
    fireEvent.click(closeButton);

    // localStorage diset
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "necly-report-issue-hidden-at",
      expect.any(String)
    );

    // Timer dibuat (verifikasi melalui setTimeout yang di-mock)
    // Kita tidak bisa langsung memverifikasi setTimeout, tapi kita bisa verifikasi
    // bahwa komponen tidak error dan state berubah
    expect(screen.queryByRole("button", { name: /Buka laporan kendala/i })).not.toBeInTheDocument();
  });

  it("menghitung sisa waktu dari localStorage saat mount (baris 132)", () => {
    // Simulasi user menutup 2 menit yang lalu
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    localStorageMock.getItem.mockReturnValue(String(twoMinutesAgo));

    render(<ReportIssueButton />);

    // Tombol seharusnya masih tersembunyi (sisa 3 menit)
    expect(screen.queryByRole("button", { name: /Buka laporan kendala/i })).not.toBeInTheDocument();
    expect(localStorageMock.getItem).toHaveBeenCalledWith("necly-report-issue-hidden-at");
  });

  it("tidak menampilkan tombol close ketika panel sedang terbuka (baris 132)", () => {
    render(<ReportIssueButton />);

    // Buka panel
    fireEvent.click(screen.getByRole("button", { name: /Buka laporan kendala/i }));

    // Tombol close trigger tidak ada saat panel terbuka
    expect(screen.queryByRole("button", { name: /Sembunyikan tombol laporan kendala selama 5 menit/i })).not.toBeInTheDocument();

    // Tombol close panel ada
    expect(screen.getByRole("button", { name: /Tutup panel laporan kendala/i })).toBeInTheDocument();
  });

  it("menjaga perilaku lama: tombol disembunyikan saat mendekati footer (baris 23)", () => {
    render(<ReportIssueButton />);

    // Trigger scroll ke dekat footer
    fireEvent.scroll(window, { target: { scrollY: 10000 } });

    // Check if component structure is correct
    const container = screen.getByRole("button", { name: /Buka laporan kendala/i }).closest(".report-issue");
    expect(container).toBeInTheDocument();
  });

  // Regresi: menghapus listener scroll membuat `nearFooter` tidak pernah di-set,
  // sehingga tombol tetap menutupi tautan footer walau test di atas tetap hijau.
  // Test ini mengukur jarak ke dasar dokumen secara nyata.
  it("memberi kelas is-hidden ketika jarak ke dasar dokumen di bawah ambang footer (baris 23)", () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(document.documentElement, "scrollHeight");
    const originalInnerHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");
    const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
    // Test lain di berkas ini memindahkan scrollY ke 10000 pada window jsdom yang
    // dipakai bersama, jadi posisi gulir harus ditetapkan ulang di sini.
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 1000, configurable: true });

    try {
      render(<ReportIssueButton />);
      const container = () => screen.getByRole("button", { name: /Buka laporan kendala/i }).closest(".report-issue");

      // Pengukuran pertama berjalan langsung di efek mount: 1000 - (0 + 800) = 200
      // piksel sisa, di bawah FOOTER_CLEARANCE (340) sehingga tombol harus sembunyi.
      expect(container()).toHaveClass("is-hidden");

      // Dokumen menjadi jauh lebih tinggi: 4000 - (0 + 800) = 3200 piksel sisa,
      // jadi tombol harus tampil lagi setelah pengukuran berikutnya dijalankan.
      Object.defineProperty(document.documentElement, "scrollHeight", { value: 4000, configurable: true });
      act(() => {
        fireEvent.resize(window);
      });
      expect(container()).not.toHaveClass("is-hidden");
    } finally {
      if (originalScrollHeight) Object.defineProperty(document.documentElement, "scrollHeight", originalScrollHeight);
      else delete (document.documentElement as unknown as Record<string, unknown>).scrollHeight;
      if (originalInnerHeight) Object.defineProperty(window, "innerHeight", originalInnerHeight);
      if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
    }
  });
});