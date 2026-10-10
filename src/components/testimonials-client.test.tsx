import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  testimonialsApi: { list: listMock },
}));

import { TestimonialsClient } from "./testimonials-client";

function testimonial(overrides: Record<string, unknown> = {}) {
  return {
    id: "tst-1",
    title: "Hemat dan lancar",
    body: "Akses dikirim cepat, harga jauh lebih murah dibanding langganan sendiri.",
    rating: 5,
    reviewer_name: "Budi Santoso",
    product_name: "Netflix Premium",
    created_at: "2026-03-01T09:00:00Z",
    ...overrides,
  };
}

describe("daftar testimoni", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("menampilkan ulasan yang dikirim backend beserta nama pemberi ulasan dan produknya", async () => {
    listMock.mockResolvedValue({ testimonials: [testimonial()], page: 1, per_page: 24, total: 1 });
    render(<TestimonialsClient />);

    expect(await screen.findByText("Hemat dan lancar")).toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("Netflix Premium")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Penilaian 5 dari 5" })).toBeInTheDocument();
    expect(screen.getByText(/Akses dikirim cepat/)).toBeInTheDocument();
  });

  // Ratings are the one piece of card metadata a screen reader cannot infer from
  // the stars, so the label has to track the actual score.
  it("memberi label bintang sesuai nilai ulasan", async () => {
    listMock.mockResolvedValue({
      testimonials: [testimonial({ id: "tst-2", rating: 3 })],
      page: 1,
      per_page: 24,
      total: 1,
    });
    render(<TestimonialsClient />);

    expect(await screen.findByRole("img", { name: "Penilaian 3 dari 5" })).toBeInTheDocument();
  });

  it("menampilkan empty state tanpa mengarang ulasan saat belum ada yang disetujui", async () => {
    listMock.mockResolvedValue({ testimonials: [], page: 1, per_page: 24, total: 0 });
    render(<TestimonialsClient />);

    expect(await screen.findByText("Belum ada testimoni yang ditampilkan")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("menampilkan peringatan dan tetap ramah saat permintaan gagal", async () => {
    listMock.mockRejectedValue(new Error("network down"));
    render(<TestimonialsClient />);

    expect(await screen.findByRole("alert")).toHaveTextContent("belum dapat dimuat dari server");
    expect(screen.getByText("Belum ada testimoni yang ditampilkan")).toBeInTheDocument();
  });

  it("meminta hanya halaman pertama dengan jumlah wajar", async () => {
    listMock.mockResolvedValue({ testimonials: [], page: 1, per_page: 24, total: 0 });
    render(<TestimonialsClient />);

    await waitFor(() => expect(listMock).toHaveBeenCalledWith({ per_page: 24 }));
  });
});
