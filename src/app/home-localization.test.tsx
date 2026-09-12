import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./(site)/page";

/** Texts of leaf nodes, so numbers split across nested elements are still comparable. */
function leafTexts(container: HTMLElement) {
  return Array.from(container.querySelectorAll("*"))
    .filter((node) => !node.children.length)
    .map((node) => node.textContent?.trim() ?? "");
}

describe("homepage marketplace content", () => {
  it("uses consistent Indonesian copy and the catalog count", () => {
    const { container } = render(<HomePage />);

    expect(leafTexts(container)).toContain("29");
    expect(screen.getAllByText(/legal|terpercaya/i).length).toBeGreaterThan(0);
    // The stat card label must stay singular-counted with the storefront catalog.
    expect(screen.getAllByText(/layanan premium/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Aktifasi/)).not.toBeInTheDocument();
  });

  it("does not show the inactive customer review section", () => {
    render(<HomePage />);
    expect(screen.queryByText("Aktivasi yang aman")).not.toBeInTheDocument();
    expect(screen.queryByText("Nabila R.")).not.toBeInTheDocument();
  });
});
