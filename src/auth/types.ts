import type { OAuthCredentials } from "./oauth/credentials.js";
import type { TokenStorage } from "./storage.js";

export enum AuthType {
  UNAUTHORIZED = "UNAUTHORIZED",
  BROWSER = "BROWSER",
  OAUTH_CUSTOM_CLIENT = "OAUTH_CUSTOM_CLIENT",
  OAUTH_CUSTOM_FULL = "OAUTH_CUSTOM_FULL",
}

export type AuthConfig =
  | { type: AuthType.UNAUTHORIZED }
  | { type: AuthType.BROWSER; cookie: string; authUser?: string; origin?: string }
  | {
      type: AuthType.OAUTH_CUSTOM_CLIENT;
      credentials: OAuthCredentials;
      storage: TokenStorage;
      onTokenRefreshed?: () => void;
      onTokenExpired?: () => void;
      onTokenRevoked?: () => void;
    }
  | {
      type: AuthType.OAUTH_CUSTOM_FULL;
      headers: Record<string, string>;
    };
