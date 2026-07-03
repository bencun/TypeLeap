import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchText, readLimitedBody } from "./http.js";

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
