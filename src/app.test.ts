import { describe, expect, it } from "vitest";
import { aboutRouteHtml, homeRouteHtml, imageRouteHtml, readRouteResult } from "./app.js";

const modernChrome =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

describe("route implementations", () => {
  it("serves the home page without starting Express", async () => {
    await expect(homeRouteHtml("")).resolves.toContain("TypeLeap!");
  });

  it("serves the about page without starting Express", () => {
    expect(aboutRouteHtml()).toContain("What in the world is TypeLeap?");
  });

  it("removes the search form for modern browsers", async () => {
    const home = await homeRouteHtml("", modernChrome);
    const about = aboutRouteHtml(modernChrome);

    expect(home).toContain("Search is only available from vintage web browsers.");
    expect(home).not.toContain('name="q"');
    expect(about).toContain("Search is only available from vintage web browsers.");
    expect(about).not.toContain('name="q"');
  });

  it("blocks search endpoint use from modern browsers", async () => {
    const page = await homeRouteHtml("frog", modernChrome);

    expect(page).toContain("TypeLeap search is reserved for old browsers");
    expect(page).not.toContain("Search Results for");
  });

  it("keeps the missing reader URL response", async () => {
    await expect(readRouteResult("")).resolves.toBe("What do you think you're doing... >:(");
  });

  it("serves an error page for invalid image URLs", () => {
    expect(imageRouteHtml("notaurl")).toContain("Image failed :(");
  });
});
