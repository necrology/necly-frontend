import { describe, expect, it } from "vitest";
import { passwordError, safeRedirectPath } from "./auth-validation";

describe("validasi autentikasi", () => {
  it("mengukur batas kata sandi 10–72 berdasarkan byte UTF-8", () => {
    expect(passwordError("123456789")).toBe("Kata sandi harus terdiri dari 10–72 byte.");
    expect(passwordError("1234567890")).toBeUndefined();
    expect(passwordError("😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀")).toBeUndefined();
    expect(passwordError("😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀a")).toBe("Kata sandi harus terdiri dari 10–72 byte.");
  });

  it("menghormati tujuan lokal setelah login dan menolak pengalihan eksternal", () => {
    expect(safeRedirectPath("/checkout?from=cart")).toBe("/checkout?from=cart");
    expect(safeRedirectPath("https://penipu.example")).toBe("/");
    expect(safeRedirectPath("//penipu.example/path")).toBe("/");
    expect(safeRedirectPath(null)).toBe("/");
  });
});
