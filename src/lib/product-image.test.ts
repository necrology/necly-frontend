import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRODUCT_ICON_MAX_DIMENSION,
  PRODUCT_ICON_QUALITY,
  compressProductIcon,
  isProductIconInput,
  safeProductImageSrc,
  validateProductImageFile,
} from "./product-image";

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

describe("icon produk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("menerima URL https, path aset publik, dan data URL", () => {
    expect(isProductIconInput("https://cdn.necly.id/icon.webp")).toBe(true);
    expect(isProductIconInput("/design-assets/logo-netflix.png")).toBe(true);
    expect(isProductIconInput("data:image/webp;base64,aWNvbg==")).toBe(true);
    expect(isProductIconInput("http://cdn.necly.id/icon.webp")).toBe(false);
    expect(isProductIconInput("javascript:alert(1)")).toBe(false);
    expect(isProductIconInput("")).toBe(false);
  });

  it("mengompres ke sisi terpanjang 256 px dan menghasilkan WebP", async () => {
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toDataURL: vi.fn(() => "data:image/webp;base64,aWNvbg=="),
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string, options?: ElementCreationOptions) => {
      if (tag === "canvas") return canvas as unknown as HTMLElement;
      return originalCreateElement(tag, options);
    }) as typeof document.createElement);

    class FakeReader {
      result: string | null = "data:image/png;base64,aWNvbg==";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        queueMicrotask(() => this.onload?.());
      }
    }
    class FakeImage {
      naturalWidth = 1024;
      naturalHeight = 512;
      width = 1024;
      height = 512;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("FileReader", FakeReader);
    vi.stubGlobal("Image", FakeImage);

    const result = await compressProductIcon(new File(["icon"], "icon.png", { type: "image/png" }));

    expect(canvas.width).toBe(PRODUCT_ICON_MAX_DIMENSION);
    expect(canvas.height).toBe(128);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 256, 128);
    expect(canvas.toDataURL).toHaveBeenCalledWith("image/webp", PRODUCT_ICON_QUALITY);
    expect(result).toBe("data:image/webp;base64,aWNvbg==");
    expect(safeProductImageSrc(result)).toBe(result);
  });
});
