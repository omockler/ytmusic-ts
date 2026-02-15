import {
  OAUTH_CODE_URL,
  OAUTH_SCOPE,
  OAUTH_TOKEN_URL,
  OAUTH_USER_AGENT,
} from "../../constants.js";
import { YTMusicServerError } from "../../errors.js";
import type { JsonDict } from "../../types.js";
import type { AuthCodeDict, BaseTokenDict, RefreshableTokenDict } from "./models.js";
import { BadOAuthClient, UnauthorizedOAuthClient } from "./exceptions.js";

export class OAuthCredentials {
  readonly clientId: string;
  readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /** Obtain a new user auth code. First step of device flow. */
  async getCode(): Promise<AuthCodeDict> {
    const response = await this.sendRequest(OAUTH_CODE_URL, {
      scope: OAUTH_SCOPE,
    });
    return response as AuthCodeDict;
  }

  /** Verify user auth code and convert into a full token. */
  async tokenFromCode(deviceCode: string): Promise<RefreshableTokenDict> {
    const response = await this.sendRequest(OAUTH_TOKEN_URL, {
      client_secret: this.clientSecret,
      grant_type: "http://oauth.net/grant_type/device/1.0",
      code: deviceCode,
    });
    return response as RefreshableTokenDict;
  }

  /** Request a new access token for a given refresh_token. */
  async refreshToken(refreshToken: string): Promise<BaseTokenDict> {
    const response = await this.sendRequest(OAUTH_TOKEN_URL, {
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    return response as BaseTokenDict;
  }

  private async sendRequest(url: string, data: JsonDict): Promise<JsonDict> {
    const body = new URLSearchParams({
      ...data,
      client_id: this.clientId,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "User-Agent": OAUTH_USER_AGENT },
      body,
    });

    if (response.status === 401) {
      const errorData = await response.json();
      const issue = errorData.error;
      if (issue === "unauthorized_client") {
        throw new UnauthorizedOAuthClient(
          "Token refresh error. Most likely client/token mismatch.",
        );
      } else if (issue === "invalid_client") {
        throw new BadOAuthClient(
          "OAuth client failure. Most likely client_id and client_secret mismatch or YouTubeData API is not enabled.",
        );
      } else {
        throw new YTMusicServerError(
          `OAuth request error. status_code: ${response.status}, url: ${url}, content: ${JSON.stringify(errorData)}`,
          response.status,
        );
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new YTMusicServerError(
        `OAuth request error. status_code: ${response.status}, url: ${url}, content: ${JSON.stringify(errorData)}`,
        response.status,
      );
    }

    return response.json();
  }
}
