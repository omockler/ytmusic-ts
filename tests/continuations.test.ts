import {
  getContinuationToken,
  getContinuationParams,
  getContinuationString,
  getContinuationContents,
  getReloadableContinuationParams,
} from "../src/continuations.js";

describe("getContinuationToken", () => {
  it("extracts continuation token from last item", () => {
    const results = [
      { other: "data" },
      {
        continuationItemRenderer: {
          continuationEndpoint: {
            continuationCommand: { token: "abc123" },
          },
        },
      },
    ];
    expect(getContinuationToken(results)).toBe("abc123");
  });

  it("returns null when no continuation token", () => {
    expect(getContinuationToken([{ other: "data" }])).toBeNull();
  });
});

describe("getContinuationString", () => {
  it("formats continuation string", () => {
    expect(getContinuationString("tok123")).toBe(
      "&ctoken=tok123&continuation=tok123",
    );
  });

  it("URL-encodes special characters", () => {
    expect(getContinuationString("a+b=c")).toBe(
      "&ctoken=a%2Bb%3Dc&continuation=a%2Bb%3Dc",
    );
  });
});

describe("getContinuationParams", () => {
  it("extracts continuation params", () => {
    const results = {
      continuations: [
        { nextContinuationData: { continuation: "ctoken123" } },
      ],
    };
    expect(getContinuationParams(results)).toBe(
      "&ctoken=ctoken123&continuation=ctoken123",
    );
  });

  it("uses custom ctoken path", () => {
    const results = {
      continuations: [
        { nextRadioContinuationData: { continuation: "radio123" } },
      ],
    };
    expect(getContinuationParams(results, "Radio")).toBe(
      "&ctoken=radio123&continuation=radio123",
    );
  });
});

describe("getReloadableContinuationParams", () => {
  it("extracts reloadable continuation params", () => {
    const results = {
      continuations: [
        { reloadContinuationData: { continuation: "reload123" } },
      ],
    };
    expect(getReloadableContinuationParams(results)).toBe(
      "&ctoken=reload123&continuation=reload123",
    );
  });
});

describe("getContinuationContents", () => {
  it("parses contents key", () => {
    const continuation = { contents: [{ id: 1 }, { id: 2 }] };
    const parseFunc = (items: any[]) => items.map((i) => ({ ...i, parsed: true }));
    const result = getContinuationContents(continuation, parseFunc);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, parsed: true });
  });

  it("parses items key", () => {
    const continuation = { items: [{ id: 1 }] };
    const parseFunc = (items: any[]) => items;
    expect(getContinuationContents(continuation, parseFunc)).toHaveLength(1);
  });

  it("returns empty array when neither key exists", () => {
    const parseFunc = (items: any[]) => items;
    expect(getContinuationContents({}, parseFunc)).toEqual([]);
  });
});
