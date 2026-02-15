import { YTMusicAuthError } from "../../errors.js";

/** OAuth client request failure — client_id/secret mismatch or API not enabled. */
export class BadOAuthClient extends YTMusicAuthError {
  constructor(message: string) {
    super(message, "invalid");
    this.name = "BadOAuthClient";
  }
}

/** OAuth client lacks permissions for specified token. */
export class UnauthorizedOAuthClient extends YTMusicAuthError {
  constructor(message: string) {
    super(message, "revoked");
    this.name = "UnauthorizedOAuthClient";
  }
}
