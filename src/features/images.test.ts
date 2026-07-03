import { describe, expect, it } from "vitest";
import { hasAllowedImageExtension, isSupportedImageUrl } from "./images.js";

describe("image helpers", () => {
  it("matches supported image extensions case-insensitively", () => {
    expect(hasAllowedImageExtension("https://example.com/FROG.JPG")).toBe(true);
    expect(hasAllowedImageExtension("https://example.com/frog.Jpeg")).toBe(true);
    expect(hasAllowedImageExtension("https://example.com/frog.PNG")).toBe(true);
    expect(hasAllowedImageExtension("https://example.com/frog.gif")).toBe(false);
  });

  it("requires HTTP URLs for supported image URLs", () => {
    expect(isSupportedImageUrl("https://example.com/frog.png")).toBe(true);
    expect(isSupportedImageUrl("ftp://example.com/frog.png")).toBe(false);
  });
});

