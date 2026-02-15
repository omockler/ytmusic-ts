import { YTM_DOMAIN, USER_AGENT } from "./constants.js";
import type { JsonDict } from "./types.js";

/** Returns default headers for YTMusic API requests. */
export function initializeHeaders(): Record<string, string> {
  return {
    "user-agent": USER_AGENT,
    "accept": "*/*",
    "accept-encoding": "gzip, deflate",
    "content-type": "application/json",
    "origin": YTM_DOMAIN,
  };
}

/** Returns the base context for YTMusic API requests. */
export function initializeContext(language?: string, location?: string): JsonDict {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const clientVersion = `1.${year}${month}${day}.01.00`;

  const client: JsonDict = {
    clientName: "WEB_REMIX",
    clientVersion,
  };

  if (language) {
    client.hl = language;
  }
  if (location) {
    client.gl = location;
  }

  return {
    context: {
      client,
      user: {},
    },
  };
}
