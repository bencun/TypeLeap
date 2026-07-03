import * as cheerio from "cheerio";
import { searchForm } from "../pages/static.js";
import { fetchText } from "../shared/http.js";
import { cleanText, escapeHtml, vintagePage } from "../shared/html.js";

export type SearchResult = {
  title: string;
  href: string;
  displayUrl: string;
  snippet: string;
};

export function duckDuckGoSearchUrl(query: string): string {
  return `https://html.duckduckgo.com/html?q=${encodeURIComponent(query)}`;
}

export function parseSearchResults(html: string): SearchResult[] {
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

export async function searchPage(query: string): Promise<string> {
  let errorText = "";
  let results: SearchResult[] = [];

  try {
    results = parseSearchResults(await fetchText(duckDuckGoSearchUrl(query)));
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
    "TypeLeap!",
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
