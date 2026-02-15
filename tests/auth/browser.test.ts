import { sapisidFromCookie, generateSapisidHash, parseBrowserHeaders } from "../../src/auth/browser.js";

describe("sapisidFromCookie", () => {
  it("extracts SAPISID from cookie string", () => {
    const cookie = "__Secure-3PAPISID=ABC123; other_cookie=value; __Secure-1PAPISID=xyz";
    expect(sapisidFromCookie(cookie)).toBe("ABC123");
  });

  it("handles quoted values", () => {
    const cookie = '"__Secure-3PAPISID=ABC123; other=val"';
    expect(sapisidFromCookie(cookie)).toBe("ABC123");
  });

  it("throws when cookie is missing", () => {
    expect(() => sapisidFromCookie("other_cookie=value")).toThrow(
      "Cookie missing required value __Secure-3PAPISID",
    );
  });
});

describe("generateSapisidHash", () => {
  it("returns SAPISIDHASH format", async () => {
    const hash = await generateSapisidHash("testSapisid");
    expect(hash).toMatch(/^SAPISIDHASH \d+_[0-9a-f]{40}$/);
  });

  it("uses provided origin", async () => {
    const hash = await generateSapisidHash("testSapisid", "https://example.com");
    expect(hash).toMatch(/^SAPISIDHASH \d+_[0-9a-f]{40}$/);
  });
});

describe("parseBrowserHeaders", () => {
  it("parses key-value header lines", () => {
    const raw = "cookie: abc123\nx-goog-authuser: 0\ncustom: value";
    const headers = parseBrowserHeaders(raw);
    expect(headers.cookie).toBe("abc123");
    expect(headers["x-goog-authuser"]).toBe("0");
    expect(headers.custom).toBe("value");
  });

  it("filters out sec- prefixed headers", () => {
    const raw = "sec-fetch-mode: cors\ncookie: abc123";
    const headers = parseBrowserHeaders(raw);
    expect(headers["sec-fetch-mode"]).toBeUndefined();
  });

  it("filters out host and content-length", () => {
    const raw = "host: example.com\ncontent-length: 100\ncookie: abc";
    const headers = parseBrowserHeaders(raw);
    expect(headers.host).toBeUndefined();
    expect(headers["content-length"]).toBeUndefined();
  });

  it("skips pseudo-headers starting with :", () => {
    const raw = ":method: GET\ncookie: abc";
    const headers = parseBrowserHeaders(raw);
    expect(headers[":method"]).toBeUndefined();
  });

  it("merges in default headers", () => {
    const raw = "cookie: abc";
    const headers = parseBrowserHeaders(raw);
    expect(headers["user-agent"]).toBeDefined();
    expect(headers["content-type"]).toBe("application/json");
  });
});
