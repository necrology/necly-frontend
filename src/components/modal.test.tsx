import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Modal } from "./modal";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Buka modal</button>
      {open && (
        <Modal
          title="Form contoh"
          description="Deskripsi modal"
          onClose={() => setOpen(false)}
          footer={<button className="button button-primary" type="button">Simpan</button>}
        >
          <label htmlFor="modal-name">Nama</label>
          <input className="input" id="modal-name" />
        </Modal>
      )}
    </>
  );
}

describe("Modal bersama", () => {
  it("merender dialog terportal dengan judul, backdrop, dan footer", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Buka modal" }));

    const dialog = await screen.findByRole("dialog", { name: "Form contoh" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Deskripsi modal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simpan" })).toBeInTheDocument();
    expect(document.body).toHaveClass("modal-open");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("menutup lewat Escape, tombol X, dan klik overlay lalu mengembalikan fokus", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Buka modal" });
    trigger.focus();

    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Form contoh" });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Form contoh" });
    fireEvent.click(screen.getByRole("button", { name: "Tutup dialog" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Form contoh" });
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body).not.toHaveClass("modal-open");
    expect(document.body.style.overflow).toBe("");
  });
});
