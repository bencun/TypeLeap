import express, { type Request, type Response as ExpressResponse } from "express";
import { compressedImage, imageViewerPage, isSupportedImageUrl } from "./features/images.js";
import { readerPage } from "./features/reader.js";
import { searchPage } from "./features/search.js";
import { aboutPage, homepage } from "./pages/static.js";
import { sendWebResponse, queryValue } from "./shared/http.js";
import { escapeHtml, vintagePage } from "./shared/html.js";

export function createApp(): express.Express {
  const app = express();

  app.get("/", async (request, response, next) => {
    try {
      const query = queryValue(request, "q");
      response.type("html").send(query ? await searchPage(query) : homepage());
    } catch (error) {
      next(error);
    }
  });

  app.get("/read", async (request, response, next) => {
    try {
      const articleUrl = queryValue(request, "a");

      if (!articleUrl) {
        response.type("txt").send("What do you think you're doing... >:(");
        return;
      }

      const result = await readerPage(articleUrl);

      if (result instanceof globalThis.Response) {
        await sendWebResponse(result, response);
        return;
      }

      response.type("html").send(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/read.php", (request, response) => {
    response.redirect(301, `/read?a=${encodeURIComponent(queryValue(request, "a"))}`);
  });

  app.get("/image", (request, response) => {
    const url = queryValue(request, "i");

    if (!url || !isSupportedImageUrl(url)) {
      response.type("html").send(vintagePage("FrogFind Image Viewer", "Image failed :("));
      return;
    }

    response.type("html").send(imageViewerPage(url, request.get("referer") ?? "/"));
  });

  app.get("/image.php", (request, response) => {
    response.redirect(301, `/image?i=${encodeURIComponent(queryValue(request, "i"))}`);
  });

  app.get("/image-compressed", async (request, response, next) => {
    try {
      const url = queryValue(request, "i");
      const image = url ? await compressedImage(url) : null;

      if (!image) {
        response.status(url && isSupportedImageUrl(url) ? 415 : 400).end();
        return;
      }

      response.type(image.contentType).send(image.buffer);
    } catch (error) {
      next(error);
    }
  });

  app.get("/image_compressed.php", (request, response) => {
    response.redirect(301, `/image-compressed?i=${encodeURIComponent(queryValue(request, "i"))}`);
  });

  app.get("/about", (_request, response) => {
    response.type("html").send(aboutPage());
  });

  app.get("/about.php", (_request, response) => {
    response.redirect(301, "/about");
  });

  app.use((error: unknown, _request: Request, response: ExpressResponse, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    response.status(500).type("html").send(vintagePage("FrogFind Error", `<p><font color='red'>${escapeHtml(message)}</font></p>`));
  });

  return app;
}

