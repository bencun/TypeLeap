import { type Request, type Response } from "express";
import { fetchTimeoutMs, htmlDownloadMaxBytes, imageDownloadMaxBytes, typeLeapUserAgent } from "../config.js";
import { normalizeContentType } from "./url.js";

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
