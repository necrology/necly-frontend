import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("mobile layout safeguards", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

  it("stacks catalog filters at phone width", () => {
    expect(css).toMatch(/@media \(max-width: 580px\)[\s\S]*?\.filter-panel\s*\{[^}]*grid-template-columns:\s*1fr/);
  });

  it("prevents dashboard controls from forcing page-level overflow", () => {
    expect(css).toMatch(/\.dashboard-main\s*\{[^}]*min-width:\s*0[^}]*overflow-x:\s*hidden/);
    expect(css).toMatch(/@media \(max-width: 580px\)[\s\S]*?\.page-header-actions\s*\{[^}]*flex-wrap:\s*wrap/);
  });
});
