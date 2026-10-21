import { describe, expect, it } from "vitest";
import { safeProductImageSrc, validateProductImageFile } from "./product-image";

describe("validasi foto produk", () => {
  it("menerima JPG, PNG, dan WebP maksimal 2 MB", () => {
    expect(validateProductImageFile({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
    expect(validateProductImageFile({ type: "image/png", size: 512_000 })).toBeNull();
    expect(validateProductImageFile({ type: "image/webp", size: 1_000_000 })).toBeNull();
  });

  it("menolak tipe yang tidak didukung dan file lebih dari 2 MB", () => {
    expect(validateProductImageFile({ type: "image/gif", size: 10_000 })).toBe("Format foto harus JPG, PNG, atau WebP.");
    expect(validateProductImageFile({ type: "image/jpeg", size: 2 * 1024 * 1024 + 1 })).toBe("Ukuran foto maksimal 2 MB.");
  });
});

describe("safeProductImageSrc", () => {
  it("mengizinkan data URL hasil kompresi dan URL https", () => {
    expect(safeProductImageSrc("data:image/jpeg;base64,Zm90bw==")).toBe("data:image/jpeg;base64,Zm90bw==");
    expect(safeProductImageSrc("https://cdn.necly.id/foto.webp")).toBe("https://cdn.necly.id/foto.webp");
  });

  it("menolak skema berbahaya dan URL http", () => {
    expect(safeProductImageSrc("javascript:alert(1)")).toBeUndefined();
    expect(safeProductImageSrc("http://cdn.necly.id/foto.jpg")).toBeUndefined();
    expect(safeProductImageSrc("")).toBeUndefined();
  });
});
