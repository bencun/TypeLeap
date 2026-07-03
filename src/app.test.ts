import { type Server } from "node:http";
import { type AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("createApp routes", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.once("listening", resolve);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    if (!server.listening) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("serves the home page", async () => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("FrogFind!");
  });

  it("serves the about page", async () => {
    const response = await fetch(`${baseUrl}/about`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("What in the world is FrogFind?");
  });

  it("keeps the missing reader URL response", async () => {
    const response = await fetch(`${baseUrl}/read`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("What do you think you're doing... >:(");
  });

  it("serves an error page for invalid image URLs", async () => {
    const response = await fetch(`${baseUrl}/image?i=notaurl`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("Image failed :(");
  });

  it("keeps legacy redirects", async () => {
    const response = await fetch(`${baseUrl}/about.php`, { redirect: "manual" });

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("/about");
  });
});
