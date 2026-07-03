import { type Request, type Response } from "express";
import { typeLeapUserAgent } from "../config.js";
import { normalizeContentType } from "./url.js";

/**
 * Reads a query parameter as a string from an Express request.
 */
export function queryValue(request: Request, name: string): string {
  const value = request.query[name];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

/**
 * Fetches a text response using the TypeLeap user agent.
 */
export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": typeLeapUserAgent
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  return response.text();
}

/**
 * Fetches a binary response body and its normalized content type.
 */
export async function fetchBuffer(url: string): Promise<{ data: ArrayBuffer; contentType: string }> {
  const response = await fetch(url, {
    headers: {
      "user-agent": typeLeapUserAgent
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  return {
    data: await response.arrayBuffer(),
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
