import type { AuthConfig } from "./types.js";
import { AuthType } from "./types.js";
import { sapisidFromCookie, generateSapisidHash } from "./browser.js";
import { OAuthToken } from "./oauth/token.js";

/**
 * Creates an async header provider based on auth configuration.
 * Browser auth regenerates SAPISIDHASH on each call.
 * OAuth auto-refreshes expiring tokens.
 */
export function createHeaderProvider(
  auth: AuthConfig,
  baseHeaders: Record<string, string>,
): () => Promise<Record<string, string>> {
  switch (auth.type) {
    case AuthType.UNAUTHORIZED:
      return async () => ({ ...baseHeaders });

    case AuthType.BROWSER: {
      const sapisid = sapisidFromCookie(auth.cookie);
      const origin = auth.origin ?? "https://music.youtube.com";
      return async () => {
        const authorization = await generateSapisidHash(sapisid, origin);
        const headers: Record<string, string> = {
          ...baseHeaders,
          authorization,
          cookie: auth.cookie,
        };
        if (auth.authUser) {
          headers["x-goog-authuser"] = auth.authUser;
        }
        return headers;
      };
    }

    case AuthType.OAUTH_CUSTOM_CLIENT: {
      let token: OAuthToken | null = null;
      const { credentials, storage, onTokenRefreshed, onTokenExpired } = auth;

      return async () => {
        // Load token from storage on first use
        if (!token) {
          const stored = await storage.load();
          if (!stored) {
            throw new Error("No OAuth token found in storage");
          }
          token = OAuthToken.fromJSON(stored);
        }

        // Auto-refresh if expiring
        if (token.isExpiring) {
          try {
            const fresh = await credentials.refreshToken(token.refreshToken);
            token.update(fresh);
            await storage.save(token.toJSON());
            onTokenRefreshed?.();
          } catch (error) {
            onTokenExpired?.();
            throw error;
          }
        }

        return {
          ...baseHeaders,
          authorization: token.asAuth(),
          "x-goog-request-time": String(Math.floor(Date.now() / 1000)),
        };
      };
    }

    case AuthType.OAUTH_CUSTOM_FULL:
      return async () => ({ ...auth.headers });
  }
}
