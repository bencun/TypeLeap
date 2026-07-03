import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { cacheKey, pageCache } from "../shared/cache.js";
import { fetchReaderResource } from "../shared/http.js";
import { cleanText, escapeHtml, vintagePage } from "../shared/html.js";
import { isHttpUrl } from "../shared/url.js";
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
 * Emits a compact reader log line for fetch diagnostics.
 */
function logReaderEvent(level: "warn" | "error", stage: string, articleUrl: string, detail: string): void {
  console[level](`[reader] ${stage} ${articleUrl} - ${detail}`);
}

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
 * Fetches an article, runs it through Readability, and renders the reader page.
 */
export async function readerPage(articleUrl: string): Promise<string | globalThis.Response> {
  if (!isHttpUrl(articleUrl)) {
    return vintagePage("TypeLeap!", "That's not a web page :(");
  }

  const key = cacheKey("reader", articleUrl);
  const cached = pageCache.get<string>(key);

  if (cached) {
    return cached;
  }

  let errorText = "";
  let dom: JSDOM | undefined;
  let article;

  try {
    const resource = await fetchReaderResource(articleUrl);

    if (resource.kind === "download") {
      return resource.response;
    }

    const { body: articleHtml, contentType } = resource;
    logReaderEvent("warn", "get-ok", articleUrl, `fetched ${articleHtml.length} bytes`);
    dom = new JSDOM(articleHtml, { url: articleUrl });
    article = new Readability(dom.window.document, {
      keepClasses: false
    }).parse();
    logReaderEvent("warn", "parse-ok", articleUrl, `content-type ${contentType || "unknown"}`);
  } catch (error) {
    logReaderEvent("error", "get-failed", articleUrl, error instanceof Error ? error.message : "Unexpected error");
    errorText += readerFetchErrorHtml(error);
  }

  const title = cleanText(article?.title ?? articleUrl);
  const readableArticle = rewriteReaderContent(article?.content ?? "");
  const images = Array.from(dom?.window.document.images ?? []).map((image) => image.src);

  const page = vintagePage(
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

  if (!errorText) {
    pageCache.set(key, page);
  }

  return page;
}

function readerFetchErrorHtml(error: unknown): string {
  return error instanceof Error ? `Sorry! ${escapeHtml(error.message)}<br>` : "Failed to get the article :( <br>";
}
