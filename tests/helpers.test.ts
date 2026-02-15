import { initializeContext, initializeHeaders } from "../src/helpers.js";

describe("initializeHeaders", () => {
  it("returns required headers", () => {
    const headers = initializeHeaders();
    expect(headers["user-agent"]).toBeDefined();
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["origin"]).toBe("https://music.youtube.com");
  });
});

describe("initializeContext", () => {
  it("returns valid context structure", () => {
    const ctx = initializeContext();
    expect(ctx.context.client.clientName).toBe("WEB_REMIX");
    expect(ctx.context.client.clientVersion).toMatch(/^1\.\d{8}\.01\.00$/);
    expect(ctx.context.user).toEqual({});
  });

  it("sets language when provided", () => {
    const ctx = initializeContext("ja");
    expect(ctx.context.client.hl).toBe("ja");
  });

  it("sets location when provided", () => {
    const ctx = initializeContext("en", "US");
    expect(ctx.context.client.gl).toBe("US");
  });

  it("omits hl/gl when not provided", () => {
    const ctx = initializeContext();
    expect(ctx.context.client.hl).toBeUndefined();
    expect(ctx.context.client.gl).toBeUndefined();
  });
});
