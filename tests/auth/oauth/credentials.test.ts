import { jest } from "@jest/globals";
import { OAuthCredentials } from "../../../src/auth/oauth/credentials.js";
import { BadOAuthClient, UnauthorizedOAuthClient } from "../../../src/auth/oauth/exceptions.js";
import { YTMusicServerError } from "../../../src/errors.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("OAuthCredentials", () => {
  const creds = new OAuthCredentials("test_client_id", "test_client_secret");

  describe("getCode", () => {
    it("returns AuthCodeDict from device code endpoint", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            device_code: "dev123",
            user_code: "ABC-DEF-GHI",
            expires_in: 1800,
            interval: 5,
            verification_url: "https://www.google.com/device",
          }),
      });

      const code = await creds.getCode();
      expect(code.device_code).toBe("dev123");
      expect(code.user_code).toBe("ABC-DEF-GHI");
      expect(code.verification_url).toBe("https://www.google.com/device");

      const call = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toContain("device/code");
    });
  });

  describe("tokenFromCode", () => {
    it("returns RefreshableTokenDict", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            access_token: "access123",
            refresh_token: "refresh456",
            scope: "https://www.googleapis.com/auth/youtube",
            token_type: "Bearer",
            expires_in: 3600,
          }),
      });

      const token = await creds.tokenFromCode("dev123");
      expect(token.access_token).toBe("access123");
      expect(token.refresh_token).toBe("refresh456");
    });
  });

  describe("refreshToken", () => {
    it("returns BaseTokenDict", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            access_token: "newAccess",
            expires_in: 3600,
            scope: "https://www.googleapis.com/auth/youtube",
            token_type: "Bearer",
          }),
      });

      const token = await creds.refreshToken("refresh456");
      expect(token.access_token).toBe("newAccess");
    });
  });

  describe("error handling", () => {
    it("throws UnauthorizedOAuthClient on unauthorized_client", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "unauthorized_client" }),
      });

      await expect(creds.refreshToken("bad")).rejects.toThrow(UnauthorizedOAuthClient);
    });

    it("throws BadOAuthClient on invalid_client", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "invalid_client" }),
      });

      await expect(creds.refreshToken("bad")).rejects.toThrow(BadOAuthClient);
    });

    it("throws YTMusicServerError on other 401 errors", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "something_else" }),
      });

      await expect(creds.refreshToken("bad")).rejects.toThrow(YTMusicServerError);
    });

    it("throws YTMusicServerError on non-401 error responses", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "internal" }),
      });

      await expect(creds.refreshToken("bad")).rejects.toThrow(YTMusicServerError);
    });
  });
});
