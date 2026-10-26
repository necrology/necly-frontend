import { fireEvent, screen, within } from "@testing-library/react";

/**
 * Helper test untuk SearchableSelect. Membuka menu lewat keyboard seperti
 * pengguna, memfilter bila perlu, lalu memilih opsi berdasarkan teksnya.
 */
export function openSearchableOptions(label: string | RegExp) {
  const input = screen.getByLabelText(label) as HTMLInputElement;
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown", keyCode: 40 });
  return screen.getByRole("listbox");
}

export function chooseSearchableOption(label: string | RegExp, option: string, search?: string) {
  const input = screen.getByLabelText(label) as HTMLInputElement;
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown", keyCode: 40 });

  if (search) {
    fireEvent.change(input, { target: { value: search } });
  }

  const listbox = screen.getByRole("listbox");
  fireEvent.click(within(listbox).getByRole("option", { name: option }));
}

export function searchableSelectedText(label: string | RegExp) {
  const input = screen.getByLabelText(label) as HTMLInputElement;
  const control = input.closest(".searchable-select");
  return control?.querySelector(".necly-select__single-value")?.textContent ?? "";
}
