import { sha1 } from "./sha1.js";
import { initializeHeaders } from "../helpers.js";

/** Extract __Secure-3PAPISID value from a cookie string. */
export function sapisidFromCookie(cookieString: string): string {
  const cleaned = cookieString.replace(/"/g, "");
  const cookies = cleaned.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (name.trim() === "__Secure-3PAPISID") {
      return valueParts.join("=");
    }
  }
  throw new Error("Cookie missing required value __Secure-3PAPISID");
}

/** Generate SAPISIDHASH authorization value. */
export async function generateSapisidHash(sapisid: string, origin = "https://music.youtube.com"): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const hashInput = `${timestamp} ${sapisid} ${origin}`;
  const hash = await sha1(hashInput);
  return `SAPISIDHASH ${timestamp}_${hash}`;
}

/** Parse raw browser headers (e.g. copy-pasted from DevTools), filtering out sec- prefixed, host, and content-length headers. */
export function parseBrowserHeaders(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const ignoreHeaders = new Set(["host", "content-length", "accept-encoding"]);

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) continue;

    const colonIndex = trimmed.indexOf(": ");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).toLowerCase();
    const value = trimmed.slice(colonIndex + 2);

    if (key.startsWith("sec-") || ignoreHeaders.has(key)) continue;

    result[key] = value;
  }

  // Merge default headers
  const defaults = initializeHeaders();
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in result)) {
      result[k] = v;
    }
  }

  return result;
}
