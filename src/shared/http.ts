import { type Request, type Response } from "express";
import {
  browserUserAgent,
  fetchTimeoutMs,
  htmlDownloadMaxBytes,
  imageDownloadMaxBytes,
  proxyDownloadMaxBytes,
  typeLeapUserAgent
} from "../config.js";
import { escapeHtml } from "./html.js";
import { normalizeContentType } from "./url.js";

export type FetchedPage = {
  body: string;
  contentType: string;
};

export type ReaderResource =
  | {
      kind: "page";
      body: string;
      contentType: string;
    }
  | {
      kind: "download";
      response: globalThis.Response;
    };

export class UnsupportedContentTypeError extends Error {
  constructor(readonly contentType: string) {
    super(`Unsupported fetched content type: ${contentType || "unknown"}`);
  }
}

/**
 * Reads a query parameter as a string from an Express request.
 */
export function queryValue(request: Request, name: string): string {
  const value = request.query[name];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

/**
 * Fetches with a consistent user agent and timeout.
 */
export async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<globalThis.Response> {
  return fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      "user-agent": typeLeapUserAgent,
      ...init.headers
    }
  });
}

/**
 * Fetches a reader page with browser-like headers and returns HTML/text unchanged.
 */
export async function fetchHtmlPage(url: string): Promise<FetchedPage> {
  const resource = await fetchReaderResource(url);

  if (resource.kind === "download") {
    throw new UnsupportedContentTypeError(resource.response.headers.get("content-type") ?? "");
  }

  return {
    body: resource.body,
    contentType: resource.contentType
  };
}

/**
 * Fetches a reader target and returns either readable page text or a small proxied download.
 */
export async function fetchReaderResource(url: string): Promise<ReaderResource> {
  const response = await fetchReaderResponse(url, browserUserAgent);

  if (isCloudflareChallenge(response)) {
    return responseToReaderResource(url, await fetchReaderResponse(url, typeLeapUserAgent));
  }

  return responseToReaderResource(url, response);
}

async function fetchReaderResponse(url: string, userAgent: string): Promise<globalThis.Response> {
  return fetchWithTimeout(url, {
    headers: {
      "user-agent": userAgent,
      accept: "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, */*;q=0.1",
      "accept-language": "en-US,en;q=0.9"
    }
  });
}

async function responseToReaderResource(url: string, response: globalThis.Response): Promise<ReaderResource> {
  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const mime = normalizeContentType(contentType);

  if (isReaderPageMime(mime)) {
    const body = new TextDecoder().decode(await readLimitedBody(response, htmlDownloadMaxBytes));
    return { kind: "page", body, contentType };
  }

  return {
    kind: "download",
    response: await proxiedDownloadResponse(url, response, contentType, mime)
  };
}

function isReaderPageMime(mime: string): boolean {
  return !mime || mime === "text/html" || mime === "application/xhtml+xml" || mime === "text/plain";
}

function isCloudflareChallenge(response: globalThis.Response): boolean {
  return response.status === 403 && response.headers.get("cf-mitigated") === "challenge";
}

async function proxiedDownloadResponse(
  url: string,
  response: globalThis.Response,
  contentType: string,
  mime: string
): Promise<globalThis.Response> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (contentLength > proxyDownloadMaxBytes) {
    return new globalThis.Response(
      `Failed to proxy file download, it's too large. :( <br>You can try downloading the file directly: ${escapeHtml(url)}`,
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const parsedUrl = new URL(url);
  const filename = parsedUrl.pathname.split("/").filter(Boolean).pop() || "download";
  const headers: HeadersInit = {
    "content-type": contentType || mime || "application/octet-stream",
    "content-disposition": `attachment; filename="${filename.replaceAll('"', "")}"`
  };

  const body = await readLimitedBody(response, proxyDownloadMaxBytes);

  return new globalThis.Response(body, {
    headers: {
      ...headers,
      "content-length": String(body.byteLength)
    }
  });
}

/**
 * Reads a response body while enforcing a maximum byte count.
 */
export async function readLimitedBody(response: globalThis.Response, maxBytes: number): Promise<ArrayBuffer> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);

  if (declaredLength > maxBytes) {
    throw new Error(`Response body exceeded ${maxBytes} bytes`);
  }

  if (!response.body) {
    return new ArrayBuffer(0);
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error(`Response body exceeded ${maxBytes} bytes`);
    }

    chunks.push(Buffer.from(value));
  }

  const buffer = Buffer.concat(chunks, totalBytes);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * Fetches a text response using the TypeLeap user agent.
 */
export async function fetchText(url: string): Promise<string> {
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  const body = await readLimitedBody(response, htmlDownloadMaxBytes);
  return new TextDecoder().decode(body);
}

/**
 * Fetches a binary response body and its normalized content type.
 */
export async function fetchBuffer(url: string): Promise<{ data: ArrayBuffer; contentType: string }> {
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  return {
    data: await readLimitedBody(response, imageDownloadMaxBytes),
    contentType: normalizeContentType(response.headers.get("content-type"))
  };
}

/**
 * Streams a Web `Response` through an Express response object.
 */
export async function sendWebResponse(webResponse: globalThis.Response, response: Response): Promise<void> {
  webResponse.headers.forEach((value, key) => response.setHeader(key, value));
  response.status(webResponse.status);

  if (!webResponse.body) {
    response.end();
    return;
  }

  const reader = webResponse.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    response.write(Buffer.from(value));
  }

  response.end();
}
