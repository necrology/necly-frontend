import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "storefront-fixes.css"), "utf8");

describe("subscription guide on mobile", () => {
  it("uses a compact one-column flow and keeps the help card in document flow", () => {
    expect(css).toContain(".guide-page { grid-template-columns: 1fr; gap: 18px;");
    expect(css).toContain(".guide-aside { position: static; width: 100%;");
    expect(css).toContain(".support-hero { padding: 34px 0 30px; }");
  });
});
