import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("installable PWA boundary", () => {
  it("publishes an installable manifest with standard and maskable icons", () => {
    const value = manifest();

    expect(value).toMatchObject({
      id: "/",
      short_name: "Alokasi",
      start_url: "/dashboard",
      scope: "/",
      display: "standalone",
    });
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
  });

  it("keeps the service worker network-first and free of financial caching", async () => {
    const source = await readFile(
      new URL("../../public/sw.js", import.meta.url),
      "utf8",
    );

    expect(source).toContain('request.mode !== "navigate"');
    expect(source).toContain('caches.match("/offline")');
    expect(source).not.toContain("cache.put");
    expect(source).not.toContain("/api/");
    expect(source).not.toContain("/transactions");
  });
});
