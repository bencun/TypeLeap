import { afterEach, describe, expect, it, vi } from "vitest";
import { browserUserAgent, typeLeapUserAgent } from "../config.js";
import { fetchHtmlPage, fetchReaderResource, fetchText, readLimitedBody } from "./http.js";

describe("readLimitedBody", () => {
  it("rejects responses larger than the configured limit", async () => {
    const response = new Response("too much", {
      headers: {
        "content-length": "8"
      }
    });

    await expect(readLimitedBody(response, 4)).rejects.toThrow("exceeded 4 bytes");
  });
});

describe("fetchText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses fetch and returns limited decoded text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("hello"));

    await expect(fetchText("https://example.com")).resolves.toBe("hello");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          "user-agent": expect.any(String)
        }),
        signal: expect.any(AbortSignal)
      })
    );
  });
});

describe("fetchHtmlPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests HTML with browser-like headers and returns the original body", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("<html><body>Hello</body></html>", { headers: { "content-type": "text/html" } }));

    await expect(fetchHtmlPage("https://example.com")).resolves.toEqual({
      body: "<html><body>Hello</body></html>",
      contentType: "text/html"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          "user-agent": browserUserAgent,
          accept: expect.stringContaining("text/html"),
          "accept-language": "en-US,en;q=0.9"
        })
      })
    );
  });

  it("accepts plain text pages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("hello", { headers: { "content-type": "text/plain" } }));

    await expect(fetchHtmlPage("https://example.com/readme.txt")).resolves.toEqual({
      body: "hello",
      contentType: "text/plain"
    });
  });

  it("rejects non-page content types", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not really an image", { headers: { "content-type": "image/png" } }));

    await expect(fetchHtmlPage("https://example.com/image.png")).rejects.toThrow("Unsupported fetched content type: image/png");
  });

  it("rejects textual data that is not a reader page", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { headers: { "content-type": "application/json" } }));

    await expect(fetchHtmlPage("https://example.com/data.json")).rejects.toThrow("Unsupported fetched content type: application/json");
  });
});

describe("fetchReaderResource", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns small non-page responses as proxied downloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("pdf-ish", {
        headers: {
          "content-type": "application/pdf",
          "content-length": "7"
        }
      })
    );

    const resource = await fetchReaderResource("https://example.com/file.pdf");

    expect(resource.kind).toBe("download");

    if (resource.kind === "download") {
      expect(resource.response.headers.get("content-type")).toBe("application/pdf");
      expect(resource.response.headers.get("content-disposition")).toBe('attachment; filename="file.pdf"');
      await expect(resource.response.text()).resolves.toBe("pdf-ish");
    }
  });

  it("retries Cloudflare challenges with the app user agent", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("challenge", {
          status: 403,
          headers: {
            "cf-mitigated": "challenge"
          }
        })
      )
      .mockResolvedValueOnce(new Response("<html>ok</html>", { headers: { "content-type": "text/html" } }));

    await expect(fetchReaderResource("https://example.com")).resolves.toEqual({
      kind: "page",
      body: "<html>ok</html>",
      contentType: "text/html"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          "user-agent": typeLeapUserAgent
        })
      })
    );
  });
});
