import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import express, { type Request, type Response as ExpressResponse } from "express";
import { JSDOM } from "jsdom";
import sharp from "sharp";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const proxyDownloadMaxBytes = 8_000_000;
const compatibleContentTypes = ["text/html", "text/plain"];
const allowedImageExtensions = [".jpg", ".jpeg", ".png"];
const allowedReaderTags = new Set([
  "a",
  "ol",
  "ul",
  "li",
  "br",
  "p",
  "small",
  "font",
  "b",
  "i",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6"
]);

type SearchResult = {
  title: string;
  href: string;
  displayUrl: string;
  snippet: string;
};

function cleanText(value: string): string {
  return value
    .replaceAll("‘", "'")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("–", "-")
    .replaceAll("&#x27;", "'");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function hasAllowedImageExtension(value: string): boolean {
  const lower = value.toLowerCase();
  return allowedImageExtensions.some((extension) => lower.includes(extension));
}

function normalizeContentType(value: string | null): string {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function vintagePage(title: string, body: string): string {
  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 2.0//EN">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<html>
<head>
  <title>${escapeHtml(title)}</title>
</head>
<body>
${body}
</body>
</html>`;
}

function homepage(): string {
  return vintagePage(
    "FrogFind!",
    `<br><br><center><h1><font size=7><font color="#008000">Frog</font>Find!</font></h1></center>
<center><h3>The Search Engine for Vintage Computers</h3></center>
<br><br>
<center>
<form action="/" method="get">
Leap to: <input type="text" size="30" name="q"><br>
<input type="submit" value="Ribbbit!">
</form>
</center>
<br><br><br>
<small><center>Built by <b><a href="https://youtube.com/ActionRetro">Action Retro</a></b> on YouTube | <a href="/about">Why build such a thing?</a></center><br>
<small><center>Powered by DuckDuckGo</center></small>`
  );
}

function searchForm(query: string): string {
  return `<form action="/" method="get">
<a href="/"><font size=6 color="#008000">Frog</font><font size=6 color="#000000">Find!</font></a> Leap again: <input type="text" size="30" name="q" value="${escapeHtml(query)}">
<input type="submit" value="Ribbbit!">
</form>`;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "FrogFind/1.0 (+https://github.com/ActionRetro/FrogFind)"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchBuffer(url: string): Promise<{ data: ArrayBuffer; contentType: string }> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "FrogFind/1.0 (+https://github.com/ActionRetro/FrogFind)"
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

function parseSearchResults(html: string): SearchResult[] {
  const $ = cheerio.load(cleanText(html).replaceAll("strong>", "b>").replaceAll("em>", "i>"));
  const results: SearchResult[] = [];

  $(".result").each((_, element) => {
    const result = $(element);

    if (result.find(".badge--ad").length > 0) {
      return;
    }

    const link = result.find(".result__a").first();
    const href = link.attr("href");

    if (!href) {
      return;
    }

    const proxiedHref = href.replace("//duckduckgo.com/l/?uddg=", "/read?a=");
    const title = cleanText(link.text().trim());
    const displayUrl = cleanText(result.find(".result__url").first().text().trim());
    const snippet = cleanText(result.find(".result__snippet").first().html() ?? "");

    if (title && displayUrl) {
      results.push({ title, href: proxiedHref, displayUrl, snippet });
    }
  });

  return results;
}

async function searchPage(query: string): Promise<string> {
  let errorText = "";
  let results: SearchResult[] = [];

  try {
    const searchUrl = `https://html.duckduckgo.com/html?q=${encodeURIComponent(query)}`;
    results = parseSearchResults(await fetchText(searchUrl));
  } catch {
    errorText = "Failed to get results, sorry :( <br>";
  }

  const resultHtml =
    results.length > 0
      ? results
          .map(
            (result) =>
              `<br><a href='${escapeHtml(result.href)}'><font size='4'><b>${result.title}</b></font><br><font color='#008000' size='2'>${escapeHtml(
                result.displayUrl
              )}</font></a><br>${result.snippet}<br><br><hr>`
          )
          .join("")
      : "<br>No results found.<br><br><hr>";

  return vintagePage(
    "FrogFind!",
    `${searchForm(query)}
<hr>
<br>
<center>Search Results for <b>${escapeHtml(query)}</b></center>
<br>
${errorText ? `<p><font color='red'>${errorText}</font></p>` : ""}
<hr>
${resultHtml}`
  );
}

function rewriteReaderContent(content: string): string {
  const $ = cheerio.load(content, null, false);

  $("script, style, noscript, iframe, object, embed").remove();
  $("*").each((_, element) => {
    if (!("tagName" in element) || !("attribs" in element)) {
      return;
    }

    const tagName = element.tagName.toLowerCase();

    if (!allowedReaderTags.has(tagName)) {
      $(element).replaceWith($(element).contents());
      return;
    }

    const attributes = element.attribs;
    for (const attribute of Object.keys(attributes)) {
      if (tagName !== "a" || attribute !== "href") {
        $(element).removeAttr(attribute);
      }
    }
  });

  return cleanText($.html())
    .replaceAll("strong>", "b>")
    .replaceAll("em>", "i>")
    .replace(/href="http/gi, 'href="/read?a=http');
}

function imageLinks(images: string[]): string {
  const links = images
    .filter(hasAllowedImageExtension)
    .map((imageUrl, index) => ` <a href='/image?i=${encodeURIComponent(imageUrl)}'>[${index + 1}]</a> `);

  if (links.length === 0) {
    return "";
  }

  return `<p><small>View page images:${links.join("")}</small></p>`;
}

async function proxyDownload(url: string, headResponse: globalThis.Response): Promise<globalThis.Response | null> {
  const contentType = normalizeContentType(headResponse.headers.get("content-type"));
  const contentLength = Number(headResponse.headers.get("content-length") ?? 0);

  if (!contentType || !headResponse.headers.has("content-length")) {
    return null;
  }

  if (compatibleContentTypes.includes(contentType)) {
    return null;
  }

  if (contentLength > proxyDownloadMaxBytes) {
    return new globalThis.Response(
      `Failed to proxy file download, it's too large. :( <br>You can try downloading the file directly: ${escapeHtml(url)}`,
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const downloadResponse = await fetch(url);
  const parsedUrl = new URL(url);
  const filename = parsedUrl.pathname.split("/").filter(Boolean).pop() || "download";

  return new globalThis.Response(downloadResponse.body, {
    headers: {
      "content-type": contentType,
      "content-length": String(contentLength),
      "content-disposition": `attachment; filename="${filename.replaceAll('"', "")}"`
    }
  });
}

async function readerPage(articleUrl: string): Promise<string | globalThis.Response> {
  if (!isHttpUrl(articleUrl)) {
    return vintagePage("FrogFind!", "That's not a web page :(");
  }

  let errorText = "";

  try {
    const headResponse = await fetch(articleUrl, { method: "HEAD" });
    const proxiedDownload = await proxyDownload(articleUrl, headResponse);

    if (proxiedDownload) {
      return proxiedDownload;
    }
  } catch {
    errorText += "Failed to get the article, its server did not return expected details :( <br>";
  }

  let dom: JSDOM | undefined;
  let article;

  try {
    const articleHtml = await fetchText(articleUrl);
    dom = new JSDOM(articleHtml, { url: articleUrl });
    article = new Readability(dom.window.document, {
      keepClasses: false
    }).parse();
  } catch (error) {
    errorText += error instanceof Error ? `Sorry! ${escapeHtml(error.message)}<br>` : "Failed to get the article :( <br>";
  }

  const title = cleanText(article?.title ?? articleUrl);
  const readableArticle = rewriteReaderContent(article?.content ?? "");
  const images = Array.from(dom?.window.document.images ?? []).map((image) => image.src);

  return vintagePage(
    title,
    `<p>
<form action="/read" method="get">
<a href="/">Back to <b><font color="#008000">Frog</font><font color="000000">Find!</font></a></b> | Browsing URL: <input type="text" size="38" name="a" value="${escapeHtml(articleUrl)}">
<input type="submit" value="Go!">
</form>
</p>
<hr>
<h1>${escapeHtml(title)}</h1>
${imageLinks(images)}
${errorText ? `<p><font color='red'>${errorText}</font></p>` : ""}
<p><font size="4">${readableArticle}</font></p>`
  );
}

function aboutPage(): string {
  return vintagePage(
    "FrogFind!",
    `${searchForm("")}
<hr>
<br>
<center>
<h1>What in the world is FrogFind?</h1>
<small>A quick FAQ on an unconventional search engine</small>
</center>
<br>
<h3>Who made FrogFind?</h3>
Hi, I'm Sean, A.K.A. <a href="https://youtube.com/ActionRetro">Action Retro</a> on YouTube. I work on a lot of 80's and 90's Macs (and other vintage machines), and I really like to try and get them online. However, the modern internet is not kind to old machines, which generally cannot handle the complicated javascript, CSS, and encryption that modern sites have. However, they can browse basic websites just fine. So I decided to see how much of the internet I could turn into basic websites, so that old machines can browse the modern internet once again!
<h3>How does FrogFind work?</h3>
The search functionality of FrogFind is basically a custom wrapper for DuckDuckGo search, converting the results to extremely basic HTML that old browsers can read. When clicking through to pages from search results, those pages are processed through Mozilla's Readability, which is what powers Firefox's reader mode. I then further strip down the results to be as basic HTML as possible.
<h3>What machines do you test FrogFind on?</h3>
I designed FrogFind with classic Macs in mind, so I've been testing on my SE/30 to make sure it looks good in 1 bit color with a 512x384 resolution. Most of my testing has been on Netscape 1.1N and 2.0.2, as well as a few 68k Mac versions of iCab. FrogFind should also work great on any text-based web browser!
<h3>How can I get in touch with you?</h3>
Send me an email! <a href="mailto:actionretro@pm.me">actionretro@pm.me</a>`
  );
}

function queryValue(request: Request, name: string): string {
  const value = request.query[name];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

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
      result.headers.forEach((value, key) => response.setHeader(key, value));

      if (result.body) {
        response.status(result.status);
        const reader = result.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          response.write(Buffer.from(value));
        }

        response.end();
      } else {
        response.status(result.status).end();
      }

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

  if (!url || !isHttpUrl(url) || !hasAllowedImageExtension(url)) {
    response.type("html").send(vintagePage("FrogFind Image Viewer", "Image failed :("));
    return;
  }

  const referer = request.get("referer") ?? "/";

  response.type("html").send(
    vintagePage(
      "FrogFind Image Viewer",
      `<small><a href="${escapeHtml(referer)}">< Back to previous page</a></small>
<p><small><b>Viewing image:</b> ${escapeHtml(url)}</small></p>
<img src="/image-compressed?i=${encodeURIComponent(url)}">
<br><br>
<small><a href="${escapeHtml(referer)}">< Back to previous page</a></small>`
    )
  );
});

app.get("/image.php", (request, response) => {
  response.redirect(301, `/image?i=${encodeURIComponent(queryValue(request, "i"))}`);
});

app.get("/image-compressed", async (request, response, next) => {
  try {
    const url = queryValue(request, "i");

    if (!url || !isHttpUrl(url) || !hasAllowedImageExtension(url)) {
      response.status(400).end();
      return;
    }

    const { data, contentType } = await fetchBuffer(url);
    const sourceImage = sharp(Buffer.from(data));
    const metadata = await sourceImage.metadata();

    if (!metadata.width || !metadata.height) {
      response.status(415).end();
      return;
    }

    const landscape = metadata.width >= metadata.height;
    const resized = sourceImage.resize({
      width: landscape ? 300 : undefined,
      height: landscape ? undefined : 200,
      withoutEnlargement: true
    });

    if (contentType === "image/png" || url.toLowerCase().includes(".png")) {
      response.type("png").send(await resized.png({ compressionLevel: 8 }).toBuffer());
      return;
    }

    response.type("jpg").send(await resized.jpeg({ quality: 80 }).toBuffer());
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

app.listen(port, () => {
  console.log(`FrogFind listening on http://localhost:${port}`);
});
