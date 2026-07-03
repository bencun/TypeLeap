import { describe, expect, it } from "vitest";
import { aboutRouteHtml, homeRouteHtml, imageRouteHtml, readRouteResult } from "./app.js";

describe("route implementations", () => {
  it("serves the home page without starting Express", async () => {
    await expect(homeRouteHtml("")).resolves.toContain("TypeLeap!");
  });

  it("serves the about page without starting Express", () => {
    expect(aboutRouteHtml()).toContain("What in the world is TypeLeap?");
  });

  it("keeps the missing reader URL response", async () => {
    await expect(readRouteResult("")).resolves.toBe("What do you think you're doing... >:(");
  });

  it("serves an error page for invalid image URLs", () => {
    expect(imageRouteHtml("notaurl")).toContain("Image failed :(");
  });
});
