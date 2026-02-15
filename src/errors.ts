/** Base error class for ytmusic-ts */
export class YTMusicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YTMusicError";
  }
}

/** Error caused by authentication issues */
export class YTMusicAuthError extends YTMusicError {
  readonly reason: "expired" | "revoked" | "invalid";

  constructor(message: string, reason: "expired" | "revoked" | "invalid" = "invalid") {
    super(message);
    this.name = "YTMusicAuthError";
    this.reason = reason;
  }

  get isRetriable(): boolean {
    return this.reason === "expired";
  }
}

/** Error caused by network failures */
export class YTMusicNetworkError extends YTMusicError {
  readonly attempt: number;
  readonly nextRetryDelay: number | null;

  constructor(message: string, attempt: number, nextRetryDelay: number | null) {
    super(message);
    this.name = "YTMusicNetworkError";
    this.attempt = attempt;
    this.nextRetryDelay = nextRetryDelay;
  }
}

/** Error caused by the YouTube Music backend */
export class YTMusicServerError extends YTMusicError {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "YTMusicServerError";
    this.statusCode = statusCode;
  }
}

/** Error caused by unexpected response structure */
export class YTMusicParseError extends YTMusicError {
  constructor(message: string) {
    super(message);
    this.name = "YTMusicParseError";
  }
}
