import { OAuthToken } from "../../../src/auth/oauth/token.js";
import type { RefreshableTokenDict } from "../../../src/auth/oauth/models.js";

function makeToken(overrides: Partial<RefreshableTokenDict> = {}): RefreshableTokenDict {
  return {
    access_token: "access123",
    refresh_token: "refresh456",
    scope: "https://www.googleapis.com/auth/youtube",
    token_type: "Bearer",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    ...overrides,
  };
}

describe("OAuthToken", () => {
  it("constructs from RefreshableTokenDict", () => {
    const token = new OAuthToken(makeToken());
    expect(token.accessToken).toBe("access123");
    expect(token.refreshToken).toBe("refresh456");
  });

  it("isExpiring returns false when token is fresh", () => {
    const token = new OAuthToken(makeToken());
    expect(token.isExpiring).toBe(false);
  });

  it("isExpiring returns true when token is about to expire", () => {
    const token = new OAuthToken(makeToken({ expires_at: Math.floor(Date.now() / 1000) + 30 }));
    expect(token.isExpiring).toBe(true);
  });

  it("isExpiring returns true when token is expired", () => {
    const token = new OAuthToken(makeToken({ expires_at: Math.floor(Date.now() / 1000) - 100 }));
    expect(token.isExpiring).toBe(true);
  });

  it("update() refreshes access token and expiration", () => {
    const token = new OAuthToken(makeToken({ expires_at: Math.floor(Date.now() / 1000) + 10 }));
    expect(token.isExpiring).toBe(true);

    token.update({
      access_token: "newAccess",
      expires_in: 7200,
      scope: "https://www.googleapis.com/auth/youtube",
      token_type: "Bearer",
    });

    expect(token.accessToken).toBe("newAccess");
    expect(token.isExpiring).toBe(false);
  });

  it("asAuth() returns authorization string", () => {
    const token = new OAuthToken(makeToken());
    expect(token.asAuth()).toBe("Bearer access123");
  });

  it("toJSON() returns serializable dict", () => {
    const token = new OAuthToken(makeToken());
    const json = token.toJSON();
    expect(json.access_token).toBe("access123");
    expect(json.refresh_token).toBe("refresh456");
    expect(json.scope).toBe("https://www.googleapis.com/auth/youtube");
    expect(json.token_type).toBe("Bearer");
    expect(typeof json.expires_at).toBe("number");
    expect(typeof json.expires_in).toBe("number");
  });

  it("fromJSON() deserializes correctly", () => {
    const original = new OAuthToken(makeToken());
    const json = original.toJSON();
    const restored = OAuthToken.fromJSON(json);
    expect(restored.accessToken).toBe(original.accessToken);
    expect(restored.refreshToken).toBe(original.refreshToken);
  });

  it("round-trips through serialization", () => {
    const data = makeToken();
    const token = new OAuthToken(data);
    const json = token.toJSON();
    const restored = OAuthToken.fromJSON(json);
    expect(restored.asAuth()).toBe(token.asAuth());
  });
});
