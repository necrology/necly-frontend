import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./storefront-fixes.css", import.meta.url), "utf8");

describe("subscription guide on mobile", () => {
  it("uses a compact one-column flow and keeps the help card in document flow", () => {
    expect(css).toContain(".guide-page { grid-template-columns: 1fr; gap: 18px;");
    expect(css).toContain(".guide-aside { position: static; width: 100%;");
    expect(css).toContain(".support-hero { padding: 34px 0 30px; }");
  });
});
