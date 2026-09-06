import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./(site)/page";
import { services } from "@/data/seed";

describe("homepage marketplace content", () => {
  it("uses consistent Indonesian activation copy and the real catalog count", () => {
    render(<HomePage />);
    expect(screen.getByText(String(services.length))).toBeInTheDocument();
    expect(screen.getAllByText(/Aktivasi/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Aktifasi/)).not.toBeInTheDocument();
  });

  it("does not show the inactive customer review section", () => {
    render(<HomePage />);
    expect(screen.queryByText("Aktivasi yang aman")).not.toBeInTheDocument();
    expect(screen.queryByText("Nabila R.")).not.toBeInTheDocument();
  });
});
