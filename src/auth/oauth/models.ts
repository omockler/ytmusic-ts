/** Limited token. Does not provide a refresh token. Commonly obtained via a token refresh. */
export interface BaseTokenDict {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/** Full token including refresh. Obtained through token setup. */
export interface RefreshableTokenDict extends BaseTokenDict {
  expires_at: number;
  refresh_token: string;
}

/** Response from the device code endpoint during OAuth auth flow. */
export interface AuthCodeDict {
  device_code: string;
  user_code: string;
  expires_in: number;
  interval: number;
  verification_url: string;
}
