import { describe, expect, it } from "vitest";
import { parseSearchResults } from "./search.js";

describe("parseSearchResults", () => {
  it("skips ads and proxies DuckDuckGo result links", () => {
    const results = parseSearchResults(`
      <div class="result">
        <a class="badge--ad">Ad</a>
        <h2 class="result__title"><a class="result__a" href="https://ad.example">Ad result</a></h2>
        <a class="result__url">ad.example</a>
        <a class="result__snippet">Sponsored</a>
      </div>
      <div class="result">
        <h2 class="result__title">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fstory">Example <strong>Story</strong></a>
        </h2>
        <a class="result__url">example.com/story</a>
        <a class="result__snippet">A <em>useful</em> result</a>
      </div>
    `);

    expect(results).toEqual([
      {
        title: "Example Story",
        href: "/read?a=https%3A%2F%2Fexample.com%2Fstory",
        displayUrl: "example.com/story",
        snippet: "A <i>useful</i> result"
      }
    ]);
  });
});

