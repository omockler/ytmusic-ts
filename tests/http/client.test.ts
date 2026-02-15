import { jest } from "@jest/globals";
import { HttpClient } from "../../src/http/client.js";
import {
  YTMusicAuthError,
  YTMusicServerError,
  YTMusicParseError,
  YTMusicNetworkError,
} from "../../src/errors.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(response: Partial<Response> & { json?: () => Promise<any>; status: number }) {
  globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    statusText: response.statusText ?? "",
    json: response.json ?? (() => Promise.resolve({})),
    headers: new Headers(),
  } as Response);
}

describe("HttpClient", () => {
  it("sends POST requests with JSON body", async () => {
    mockFetch({
      status: 200,
      json: () => Promise.resolve({ result: "ok" }),
    });

    const client = new HttpClient();
    const result = await client.post("https://example.com/api", { key: "value" });

    expect(result).toEqual({ result: "ok" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("sends GET requests", async () => {
    mockFetch({
      status: 200,
      json: () => Promise.resolve({ items: [] }),
    });

    const client = new HttpClient();
    const result = await client.get("https://example.com/api");

    expect(result).toEqual({ items: [] });
  });

  it("uses header provider", async () => {
    mockFetch({
      status: 200,
      json: () => Promise.resolve({}),
    });

    const client = new HttpClient({
      headerProvider: async () => ({ authorization: "Bearer token123" }),
    });

    await client.get("https://example.com/api");

    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(call[1].headers.authorization).toBe("Bearer token123");
  });

  it("throws YTMusicAuthError on 401", async () => {
    mockFetch({ status: 401 });

    const client = new HttpClient({ maxRetries: 0 });
    await expect(client.get("https://example.com")).rejects.toThrow(YTMusicAuthError);
  });

  it("throws YTMusicAuthError on 403", async () => {
    mockFetch({ status: 403 });

    const client = new HttpClient({ maxRetries: 0 });
    await expect(client.get("https://example.com")).rejects.toThrow(YTMusicAuthError);
  });

  it("throws YTMusicServerError on 500", async () => {
    mockFetch({ status: 500 });

    const client = new HttpClient({ maxRetries: 0 });
    await expect(client.get("https://example.com")).rejects.toThrow(YTMusicServerError);
  });

  it("throws YTMusicParseError on invalid JSON", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
      headers: new Headers(),
    } as unknown as Response);

    const client = new HttpClient({ maxRetries: 0 });
    await expect(client.get("https://example.com")).rejects.toThrow(YTMusicParseError);
  });

  it("throws YTMusicNetworkError after retries exhausted", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError("fetch failed"));

    const client = new HttpClient({ maxRetries: 1, retryBaseDelay: 1 });
    await expect(client.get("https://example.com")).rejects.toThrow(YTMusicNetworkError);
  });

  it("retries on retryable status codes", async () => {
    let callCount = 0;
    globalThis.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
      });
    });

    const client = new HttpClient({ maxRetries: 2, retryBaseDelay: 1 });
    const result = await client.post("https://example.com", {});
    expect(result).toEqual({ success: true });
    expect(callCount).toBe(2);
  });
});
