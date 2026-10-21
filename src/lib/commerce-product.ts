import type { CommerceProduct } from "@/data/products";
import type { SubscriptionProduct } from "./types";
import type { ApiProduct } from "./api";
import { mapApiProduct } from "./product-mapper";

type BrandTone = CommerceProduct["logoTone"];

/**
 * Brand adalah metadata presentasi, bukan field API (W0 C-04). Urutan pola
 * mengikuti kontrak: pola pertama yang cocok menang. Nama yang tidak dikenal
 * memakai teks netral berisi nama produk, bukan logo vendor lain.
 */
const brandRules: Array<{ pattern: RegExp; tone: BrandTone; brand: (name: string) => string }> = [
  // Bundling harus diperiksa lebih dulu: namanya juga mengandung "netflix".
  { pattern: /disney/i, tone: "disney", brand: (name) => (/netflix/i.test(name) ? "Disney+ × Netflix" : "Disney+ Hotstar") },
  { pattern: /netflix/i, tone: "netflix", brand: () => "NETFLIX" },
  { pattern: /apple/i, tone: "apple", brand: () => " Apple One" },
  { pattern: /viu/i, tone: "viu", brand: () => "Viu" },
  { pattern: /nord/i, tone: "nord", brand: () => "NordVPN" },
  { pattern: /spotify/i, tone: "spotify", brand: () => "Spotify" },
  { pattern: /youtube/i, tone: "youtube", brand: () => "YouTube Premium" },
  { pattern: /microsoft|office|365/i, tone: "microsoft", brand: () => "Microsoft 365" },
  { pattern: /canva/i, tone: "canva", brand: () => "Canva Teams" },
  { pattern: /google one/i, tone: "googleone", brand: () => "Google One 2 TB" },
  { pattern: /dropbox/i, tone: "dropbox", brand: () => "Dropbox" },
];

export function brandForProduct(name: string): { brand: string; logoTone: BrandTone } {
  const rule = brandRules.find((candidate) => candidate.pattern.test(name));
  return rule
    ? { brand: rule.brand(name), logoTone: rule.tone }
    : { brand: name, logoTone: "generic" };
}

type CommerceOptions = {
  groupMembers?: number;
  providerPrice?: number;
  discount?: number;
};

/**
 * Adapts any catalog product (legacy seed or backend API) to the storefront
 * card/detail shape without changing the existing presentation components.
 */
export function toCommerceProduct(product: SubscriptionProduct, options: CommerceOptions = {}): CommerceProduct {
  const option = product.priceOptions[0];
  const groupMembers = options.groupMembers ?? 4;
  const providerPrice = options.providerPrice ?? product.price * groupMembers;
  const { brand, logoTone } = brandForProduct(product.name);

  return {
    ...product,
    brand,
    packageName: option?.label ?? product.duration,
    logoTone,
    providerPrice,
    groupMembers,
    discount: options.discount ?? 0,
  };
}

/**
 * Live products carry only real values. We deliberately do not invent a
 * provider price or discount: the detail screen shows the catalog amount as the
 * package price and no discount for live data.
 */
export function mapApiCommerceProduct(product: ApiProduct): CommerceProduct {
  const mapped = mapApiProduct(product);
  return toCommerceProduct(mapped, {
    groupMembers: 1,
    providerPrice: mapped.price,
    discount: 0,
  });
}
