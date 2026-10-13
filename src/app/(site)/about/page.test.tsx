import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "./page";

describe("halaman Tentang", () => {
  it("menjelaskan model bisnis akun sharing hemat tanpa klaim proyek/konsep rancu", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { name: /Langganan premium lebih terjangkau melalui pembagian akun yang sah/i })).toBeInTheDocument();
    expect(screen.getByText(/Pilih\. Bayar\. Aktifkan\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Curai\. Klarifikasi\. Operasikan\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ringkasan proyek/i)).not.toBeInTheDocument();
  });

  // Baris 68: seluruh halaman ini tidak boleh lagi memakai kata "slot".
  it("tidak memakai kata slot lagi setelah revisi QA", () => {
    const { container } = render(<AboutPage />);

    expect(container.textContent ?? "").not.toMatch(/slot/i);
  });
});
