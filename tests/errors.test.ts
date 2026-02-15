import {
  YTMusicError,
  YTMusicAuthError,
  YTMusicNetworkError,
  YTMusicServerError,
  YTMusicParseError,
} from "../src/errors.js";

describe("Error hierarchy", () => {
  it("all errors extend YTMusicError", () => {
    expect(new YTMusicAuthError("auth")).toBeInstanceOf(YTMusicError);
    expect(new YTMusicNetworkError("net", 1, null)).toBeInstanceOf(YTMusicError);
    expect(new YTMusicServerError("srv", 500)).toBeInstanceOf(YTMusicError);
    expect(new YTMusicParseError("parse")).toBeInstanceOf(YTMusicError);
  });

  it("all errors extend Error", () => {
    expect(new YTMusicError("base")).toBeInstanceOf(Error);
  });
});

describe("YTMusicAuthError", () => {
  it("has reason property", () => {
    const err = new YTMusicAuthError("expired", "expired");
    expect(err.reason).toBe("expired");
    expect(err.isRetriable).toBe(true);
  });

  it("defaults to invalid reason", () => {
    const err = new YTMusicAuthError("bad");
    expect(err.reason).toBe("invalid");
    expect(err.isRetriable).toBe(false);
  });

  it("revoked is not retriable", () => {
    const err = new YTMusicAuthError("revoked", "revoked");
    expect(err.isRetriable).toBe(false);
  });
});

describe("YTMusicNetworkError", () => {
  it("has attempt and nextRetryDelay", () => {
    const err = new YTMusicNetworkError("fail", 3, 2000);
    expect(err.attempt).toBe(3);
    expect(err.nextRetryDelay).toBe(2000);
  });
});

describe("YTMusicServerError", () => {
  it("has statusCode", () => {
    const err = new YTMusicServerError("fail", 500);
    expect(err.statusCode).toBe(500);
  });
});
