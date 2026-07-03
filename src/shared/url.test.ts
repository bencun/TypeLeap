import { describe, expect, it } from "vitest";
import { isHttpUrl, normalizeContentType } from "./url.js";

describe("URL helpers", () => {
  it("accepts only HTTP and HTTPS URLs", () => {
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("ftp://example.com")).toBe(false);
    expect(isHttpUrl("not a url")).toBe(false);
  });

  it("normalizes content types", () => {
    expect(normalizeContentType("Text/HTML; charset=utf-8")).toBe("text/html");
    expect(normalizeContentType(null)).toBe("");
  });
});

