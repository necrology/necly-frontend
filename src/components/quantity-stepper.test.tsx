import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./quantity-stepper";

describe("QuantityStepper", () => {
  it("menampilkan nilai dan meneruskan perubahan jumlah", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} min={1} max={5} itemName="Netflix Premium" onChange={onChange} />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Jumlah Netflix Premium" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Kurangi jumlah Netflix Premium" }));
    expect(onChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "Tambah jumlah Netflix Premium" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("menonaktifkan tombol pada batas minimal dan maksimal", () => {
    const onChange = vi.fn();
    const { rerender } = render(<QuantityStepper value={1} min={1} max={5} onChange={onChange} />);

    const minus = screen.getByRole("button", { name: "Kurangi jumlah" });
    const plus = screen.getByRole("button", { name: "Tambah jumlah" });
    expect(minus).toBeDisabled();
    expect(plus).toBeEnabled();

    fireEvent.click(minus);
    expect(onChange).not.toHaveBeenCalled();

    rerender(<QuantityStepper value={5} min={1} max={5} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Kurangi jumlah" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Tambah jumlah" })).toBeDisabled();
  });

  it("menonaktifkan kedua tombol saat disabled diberikan", () => {
    render(<QuantityStepper value={2} min={1} max={5} disabled onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Kurangi jumlah" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tambah jumlah" })).toBeDisabled();
  });
});
