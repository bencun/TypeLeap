import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { compatibleContentTypes, proxyDownloadMaxBytes } from "../config.js";
import { fetchText } from "../shared/http.js";
import { cleanText, escapeHtml, vintagePage } from "../shared/html.js";
import { isHttpUrl, normalizeContentType } from "../shared/url.js";
import { hasAllowedImageExtension } from "./images.js";

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

/**
 * Strips unsupported markup and leaves only the vintage-safe reader tags.
 */
export function rewriteReaderContent(content: string): string {
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

/**
 * Renders the list of linked images discovered in a reader page.
 */
export function imageLinks(images: string[]): string {
  const links = images
    .filter(hasAllowedImageExtension)
    .map((imageUrl, index) => ` <a href='/image?i=${encodeURIComponent(imageUrl)}'>[${index + 1}]</a> `);

  if (links.length === 0) {
    return "";
  }

  return `<p><small>View page images:${links.join("")}</small></p>`;
}

/**
 * Proxies non-HTML downloads through TypeLeap when the payload is small enough.
 */
export async function proxyDownload(url: string, headResponse: globalThis.Response): Promise<globalThis.Response | null> {
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

/**
 * Fetches an article, runs it through Readability, and renders the reader page.
 */
export async function readerPage(articleUrl: string): Promise<string | globalThis.Response> {
  if (!isHttpUrl(articleUrl)) {
    return vintagePage("TypeLeap!", "That's not a web page :(");
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
<a href="/">Back to <b><font color="#008000">Type</font><font color="000000">Leap!</font></a></b> | Browsing URL: <input type="text" size="38" name="a" value="${escapeHtml(articleUrl)}">
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
