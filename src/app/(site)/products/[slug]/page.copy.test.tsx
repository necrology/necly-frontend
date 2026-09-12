import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { services } from "@/data/seed";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));

import ProductPage from "./page";

describe("copy detail produk", () => {
  it("tidak menampilkan bukti sosial atau data operator palsu", async () => {
    const product = services[0];

    const { container } = render(await ProductPage({ params: Promise.resolve({ slug: product.slug }) }));
    const structuredData = container.querySelector('script[type="application/ld+json"]')?.textContent ?? "";

    expect(container.querySelector(".rating")).not.toBeInTheDocument();
    expect(structuredData).not.toContain("aggregateRating");
    expect(container.textContent).not.toMatch(/ulasan|terpenuhi|waktu respons/i);
    expect(container.querySelector(".seller-card")).not.toBeInTheDocument();
  });
});
