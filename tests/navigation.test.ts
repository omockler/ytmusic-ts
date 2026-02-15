import { nav, findObjectByKey, findObjectsByKey, TITLE_TEXT, NAVIGATION_BROWSE_ID } from "../src/navigation.js";
import { YTMusicParseError } from "../src/errors.js";

describe("nav", () => {
  const data = {
    a: {
      b: {
        c: "found",
      },
      list: [{ x: 1 }, { x: 2 }],
    },
  };

  it("traverses nested objects by string keys", () => {
    expect(nav(data, ["a", "b", "c"])).toBe("found");
  });

  it("traverses arrays by numeric index", () => {
    expect(nav(data, ["a", "list", 0, "x"])).toBe(1);
    expect(nav(data, ["a", "list", 1, "x"])).toBe(2);
  });

  it("throws YTMusicParseError on missing path", () => {
    expect(() => nav(data, ["a", "missing"])).toThrow(YTMusicParseError);
  });

  it("returns undefined on missing path when noneIfAbsent is true", () => {
    expect(nav(data, ["a", "missing"], true)).toBeUndefined();
  });

  it("returns undefined for null root", () => {
    expect(nav(null, ["a"], true)).toBeUndefined();
  });

  it("works with path constants", () => {
    const ytData = { title: { runs: [{ text: "Hello" }] } };
    expect(nav(ytData, TITLE_TEXT)).toBe("Hello");
  });

  it("works with browse id paths", () => {
    const ytData = {
      navigationEndpoint: { browseEndpoint: { browseId: "UC123" } },
    };
    expect(nav(ytData, NAVIGATION_BROWSE_ID)).toBe("UC123");
  });
});

describe("findObjectByKey", () => {
  const list = [
    { musicShelfRenderer: { title: "shelf1" } },
    { gridRenderer: { title: "grid1" } },
    { musicShelfRenderer: { title: "shelf2" } },
  ];

  it("finds the first object containing the key", () => {
    const result = findObjectByKey(list, "musicShelfRenderer");
    expect(result).toEqual({ musicShelfRenderer: { title: "shelf1" } });
  });

  it("returns the value when isKey is true", () => {
    const result = findObjectByKey(list, "musicShelfRenderer", undefined, true);
    expect(result).toEqual({ title: "shelf1" });
  });

  it("returns undefined when key is not found", () => {
    expect(findObjectByKey(list, "notHere")).toBeUndefined();
  });

  it("supports nested lookups", () => {
    const nestedList = [
      { renderer: { musicShelfRenderer: { title: "nested" } } },
    ];
    const result = findObjectByKey(nestedList, "musicShelfRenderer", "renderer");
    expect(result).toEqual({ musicShelfRenderer: { title: "nested" } });
  });
});

describe("findObjectsByKey", () => {
  const list = [
    { musicShelfRenderer: { title: "shelf1" } },
    { gridRenderer: { title: "grid1" } },
    { musicShelfRenderer: { title: "shelf2" } },
  ];

  it("finds all objects containing the key", () => {
    const results = findObjectsByKey(list, "musicShelfRenderer");
    expect(results).toHaveLength(2);
  });

  it("returns empty array when key is not found", () => {
    expect(findObjectsByKey(list, "notHere")).toHaveLength(0);
  });
});
