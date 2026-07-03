import { describe, expect, it } from "vitest";
import { proxyDownload, rewriteReaderContent } from "./reader.js";

describe("rewriteReaderContent", () => {
  it("keeps vintage-safe tags and strips unsupported tags and attributes", () => {
    const output = rewriteReaderContent(`
      <div class="layout">
        <p class="intro">Hello <b class="bold">frog</b></p>
        <a class="link" onclick="bad()" href="https://example.com">Read</a>
        <script>alert("no")</script>
      </div>
    `);

    expect(output).toContain("<p>Hello <b>frog</b></p>");
    expect(output).toContain('<a href="/read?a=https://example.com">Read</a>');
    expect(output).not.toContain("class=");
    expect(output).not.toContain("script");
  });
});

describe("proxyDownload", () => {
  it("skips non-ok HEAD responses", async () => {
    const headResponse = new Response("<html>blocked</html>", {
      status: 403,
      headers: {
        "content-type": "text/html",
        "content-length": "20"
      }
    });

    await expect(proxyDownload("https://example.com/article", headResponse)).resolves.toBeNull();
  });
});
