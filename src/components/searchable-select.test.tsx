import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { chooseSearchableOption, openSearchableOptions, searchableSelectedText } from "@/test/searchable-select";
import { Modal } from "./modal";
import { SearchableSelect } from "./searchable-select";

const options = [
  { value: "netflix", label: "Netflix Premium" },
  { value: "spotify", label: "Spotify Premium" },
  { value: "viu", label: "Viu Premium" },
];

function Harness({ name }: { name?: string }) {
  const [value, setValue] = useState("netflix");
  return (
    <SearchableSelect
      ariaLabel="Pilih produk"
      name={name}
      options={options}
      value={value}
      onChange={setValue}
    />
  );
}

function ModalHarness() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Buka modal</button>
      {open && (
        <Modal title="Produk baru" onClose={() => setOpen(false)}>
          <label htmlFor="modal-category">Kategori</label>
          <SearchableSelect
            inputId="modal-category"
            ariaLabel="Kategori"
            options={options}
            value={value}
            onChange={setValue}
          />
        </Modal>
      )}
    </>
  );
}

describe("SearchableSelect", () => {
  it("memfilter opsi lewat input pencarian lalu memilih hasilnya", () => {
    render(<Harness />);

    expect(searchableSelectedText("Pilih produk")).toBe("Netflix Premium");

    // Ketik "Spot" untuk mempersempit daftar sebelum memilih.
    const listbox = openSearchableOptions("Pilih produk");
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);

    const input = screen.getByLabelText("Pilih produk");
    fireEvent.change(input, { target: { value: "Spot" } });

    const filtered = screen.getByRole("listbox");
    const filteredOptions = within(filtered).getAllByRole("option");
    expect(filteredOptions.map((option) => option.textContent)).toEqual(["Spotify Premium"]);

    fireEvent.click(within(filtered).getByRole("option", { name: "Spotify Premium" }));
    expect(searchableSelectedText("Pilih produk")).toBe("Spotify Premium");
  });

  it("mengirim nilai terpilih lewat hidden input bernama", () => {
    const submitted: Array<FormDataEntryValue | null> = [];
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted.push(new FormData(event.currentTarget).get("plan"));
        }}
      >
        <Harness name="plan" />
        <button type="submit">Kirim</button>
      </form>,
    );

    chooseSearchableOption("Pilih produk", "Viu Premium", "Viu");
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));

    expect(submitted).toEqual(["viu"]);
  });

  it("menampilkan daftar opsi di atas backdrop modal dan tetap bisa dipilih", async () => {
    render(<ModalHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Buka modal" }));

    const dialog = await screen.findByRole("dialog", { name: "Produk baru" });
    const listbox = openSearchableOptions("Kategori");
    const portal = listbox.closest(".necly-select__menu-portal") as HTMLElement | null;

    // Menu dipindah ke portal di body (di luar dialog) supaya tidak terpotong,
    // tetapi z-index-nya harus di atas `.modal-overlay` (z-index 200).
    expect(portal).not.toBeNull();
    expect(dialog).not.toContainElement(listbox);
    expect(document.body).toContainElement(portal);
    expect(Number(window.getComputedStyle(portal as HTMLElement).zIndex)).toBeGreaterThan(200);

    fireEvent.click(within(listbox).getByRole("option", { name: "Spotify Premium" }));
    expect(searchableSelectedText("Kategori")).toBe("Spotify Premium");
  });
});
