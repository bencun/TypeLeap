import { describe, expect, it } from "vitest";
import { cleanText, escapeHtml } from "./html.js";

describe("HTML helpers", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml(`<frog attr="ribbit">it's green & small</frog>`)).toBe(
      "&lt;frog attr=&quot;ribbit&quot;&gt;it&#039;s green &amp; small&lt;/frog&gt;"
    );
  });

  it("normalizes typographic characters for old browsers", () => {
    expect(cleanText("“Hello”–‘frog’ &#x27;test&#x27;")).toBe('"Hello"-\'frog\' \'test\'');
  });
});
