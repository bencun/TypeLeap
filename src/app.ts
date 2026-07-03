import express, { type Request, type Response as ExpressResponse } from "express";
import { compressedImage, imageViewerPage, isSupportedImageUrl } from "./features/images.js";
import { readerPage } from "./features/reader.js";
import { searchPage } from "./features/search.js";
import { aboutPage, homepage } from "./pages/static.js";
import { cacheKey, pageCache } from "./shared/cache.js";
import { sendWebResponse, queryValue } from "./shared/http.js";
import { escapeHtml, vintagePage } from "./shared/html.js";

export type BinaryRouteResult = {
  buffer: Buffer;
  contentType: string;
} | null;

export async function homeRouteHtml(query: string): Promise<string> {
  if (query) {
    return searchPage(query);
  }

  return cachedStaticPage("home", homepage);
}

export async function readRouteResult(articleUrl: string): Promise<string | globalThis.Response> {
  if (!articleUrl) {
    return "What do you think you're doing... >:(";
  }

  return readerPage(articleUrl);
}

export function imageRouteHtml(url: string, referer = "/"): string {
  if (!url || !isSupportedImageUrl(url)) {
    return vintagePage("TypeLeap Image Viewer", "Image failed :(");
  }

  const key = cacheKey("image-page", `${url}:${referer}`);
  const cached = pageCache.get<string>(key);

  if (cached) {
    return cached;
  }

  const page = imageViewerPage(url, referer);
  pageCache.set(key, page);
  return page;
}

export async function imageCompressedRouteResult(url: string): Promise<BinaryRouteResult> {
  const image = url ? await compressedImage(url) : null;

  if (!image) {
    return null;
  }

  return {
    buffer: image.buffer,
    contentType: image.contentType
  };
}

export function aboutRouteHtml(): string {
  return cachedStaticPage("about", aboutPage);
}

function cachedStaticPage(name: string, render: () => string): string {
  const key = cacheKey("static", name);
  const cached = pageCache.get<string>(key);

  if (cached) {
    return cached;
  }

  const page = render();
  pageCache.set(key, page);
  return page;
}

/**
 * Builds the Express application and wires the FrogFind routes.
 */
export function createApp(): express.Express {
  const app = express();

  /**
   * Serves the home page or DuckDuckGo-backed search results.
   */
  app.get("/", async (request, response, next) => {
    try {
      const query = queryValue(request, "q");
      response.type("html").send(await homeRouteHtml(query));
    } catch (error) {
      next(error);
    }
  });

  /**
   * Serves the reader view for a supplied article URL.
   */
  app.get("/read", async (request, response, next) => {
    try {
      const result = await readRouteResult(queryValue(request, "a"));

      if (result instanceof globalThis.Response) {
        await sendWebResponse(result, response);
        return;
      }

      response.type("html").send(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Shows the old-browser-friendly image viewer for supported image URLs.
   */
  app.get("/image", (request, response) => {
    const url = queryValue(request, "i");
    response.type("html").send(imageRouteHtml(url, request.get("referer") ?? "/"));
  });

  /**
   * Serves the compressed image binary for a supported image URL.
   */
  app.get("/image-compressed", async (request, response, next) => {
    try {
      const url = queryValue(request, "i");
      const image = await imageCompressedRouteResult(url);

      if (!image) {
        response.status(url && isSupportedImageUrl(url) ? 415 : 400).end();
        return;
      }

      response.type(image.contentType).send(image.buffer);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Serves the TypeLeap about page.
   */
  app.get("/about", (_request, response) => {
    response.type("html").send(aboutRouteHtml());
  });

  /**
   * Converts unexpected failures into a minimal HTML error page.
   */
  app.use((error: unknown, _request: Request, response: ExpressResponse, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    response.status(500).type("html").send(vintagePage("TypeLeap Error", `<p><font color='red'>${escapeHtml(message)}</font></p>`));
  });

  return app;
}
