import { type Request, type Response } from "express";
import { frogFindUserAgent } from "../config.js";
import { normalizeContentType } from "./url.js";

export function queryValue(request: Request, name: string): string {
  const value = request.query[name];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": frogFindUserAgent
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  return response.text();
}

export async function fetchBuffer(url: string): Promise<{ data: ArrayBuffer; contentType: string }> {
  const response = await fetch(url, {
    headers: {
      "user-agent": frogFindUserAgent
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

