import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { ProductBrand } from "./product-brand";

const netflix = products.find((product) => product.logoTone === "netflix")!;
const spotify = products.find((product) => product.logoTone === "spotify")!;

describe("ProductBrand", () => {
  it.each([
    ["Netflix", netflix],
    ["Spotify", spotify],
  ])("memberikan canvas mobile yang sama untuk %s", (_label, product) => {
    const { unmount } = render(<ProductBrand product={{ ...product, iconUrl: undefined }} compact />);

    const brand = screen.getByLabelText(product.brand);
    const canvas = screen.getByTestId("product-icon");
    expect(brand).toHaveClass("compact");
    expect(canvas).toHaveClass("product-brand-icon");
    expect(canvas).toHaveStyle({ width: "72px", height: "30px" });
    expect(canvas.querySelector(".figma-desktop-product-assets")).toBeInTheDocument();

    unmount();
  });

  it("memakai canvas yang sama untuk icon_url backend dan mempertahankan object-fit contain", () => {
    render(<ProductBrand product={{ ...netflix, iconUrl: "https://cdn.necly.id/netflix.png" }} />);

    const canvas = screen.getByTestId("product-icon");
    const image = screen.getByAltText(`Icon ${netflix.brand}`);
    expect(canvas).toHaveStyle({ width: "96px", height: "40px" });
    expect(image).toHaveClass("product-icon-image");
  });
});
