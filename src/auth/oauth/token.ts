import type { BaseTokenDict, RefreshableTokenDict } from "./models.js";

/** Wrapper for an OAuth token. */
export class OAuthToken {
  scope: string;
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;

  constructor(data: RefreshableTokenDict) {
    this.scope = data.scope;
    this.tokenType = data.token_type;
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = data.expires_at;
  }

  /** Returns true if token expires in less than 60 seconds. */
  get isExpiring(): boolean {
    return this.expiresAt - Math.floor(Date.now() / 1000) < 60;
  }

  /** Update access_token and expiration with fresh token data. */
  update(fresh: BaseTokenDict): void {
    this.accessToken = fresh.access_token;
    this.expiresAt = Math.floor(Date.now() / 1000) + fresh.expires_in;
  }

  /** Returns Authorization header string. */
  asAuth(): string {
    return `${this.tokenType} ${this.accessToken}`;
  }

  /** Serialize to a persistable dict. */
  toJSON(): RefreshableTokenDict {
    return {
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      scope: this.scope,
      token_type: this.tokenType,
      expires_at: this.expiresAt,
      expires_in: this.expiresAt - Math.floor(Date.now() / 1000),
    };
  }

  /** Deserialize from a persistable dict. */
  static fromJSON(data: RefreshableTokenDict): OAuthToken {
    return new OAuthToken(data);
  }
}
