import {
  getSearchResultType,
  getSearchParams,
  parseSearchSuggestions,
} from "../../src/parsers/search.js";

describe("getSearchResultType", () => {
  const resultTypes = ["album", "artist", "playlist", "song", "video", "station", "profile", "podcast", "episode"];

  it("returns matching result type", () => {
    expect(getSearchResultType("song", resultTypes)).toBe("song");
    expect(getSearchResultType("artist", resultTypes)).toBe("artist");
    expect(getSearchResultType("video", resultTypes)).toBe("video");
  });

  it("defaults to album for unknown types", () => {
    expect(getSearchResultType("Single", resultTypes)).toBe("album");
    expect(getSearchResultType("EP", resultTypes)).toBe("album");
  });

  it("returns null for empty string", () => {
    expect(getSearchResultType("", resultTypes)).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(getSearchResultType("SONG", resultTypes)).toBe("song");
    expect(getSearchResultType("Artist", resultTypes)).toBe("artist");
  });
});

describe("getSearchParams", () => {
  it("returns null for default search", () => {
    expect(getSearchParams(null, null, false)).toBeNull();
  });

  it("returns params for uploads scope", () => {
    expect(getSearchParams(null, "uploads", false)).toBe("agIYAw%3D%3D");
  });

  it("returns params for library scope without filter", () => {
    expect(getSearchParams(null, "library", false)).toBe("agIYBA%3D%3D");
  });

  it("returns params for songs filter", () => {
    const params = getSearchParams("songs", null, false);
    expect(params).toContain("EgWKAQ");
    expect(params).toContain("II");
  });

  it("returns params for playlists filter", () => {
    const params = getSearchParams("playlists", null, false);
    expect(params).toContain("Eg-KAQwIABAAGAAgACgB");
  });

  it("returns params for ignore spelling only", () => {
    const params = getSearchParams(null, null, true);
    expect(params).toBe("EhGKAQ4IARABGAEgASgAOAFAAUICCAE%3D");
  });

  it("returns params for featured_playlists filter", () => {
    const params = getSearchParams("featured_playlists", null, false);
    expect(params).toContain("EgeKAQQoA");
    expect(params).toContain("Dg");
  });

  it("returns params for community_playlists filter", () => {
    const params = getSearchParams("community_playlists", null, false);
    expect(params).toContain("EA");
  });
});

describe("parseSearchSuggestions", () => {
  it("returns plain text suggestions when detailedRuns is false", () => {
    const data = {
      contents: [
        {
          searchSuggestionsSectionRenderer: {
            contents: [
              {
                searchSuggestionRenderer: {
                  navigationEndpoint: { searchEndpoint: { query: "faded" } },
                  suggestion: { runs: [{ text: "fade", bold: true }, { text: "d" }] },
                },
              },
              {
                searchSuggestionRenderer: {
                  navigationEndpoint: { searchEndpoint: { query: "faded alan walker" } },
                  suggestion: { runs: [{ text: "fade", bold: true }, { text: "d alan walker" }] },
                },
              },
            ],
          },
        },
      ],
    };
    const result = parseSearchSuggestions(data, false);
    expect(result).toEqual(["faded", "faded alan walker"]);
  });

  it("returns detailed runs when flag is true", () => {
    const data = {
      contents: [
        {
          searchSuggestionsSectionRenderer: {
            contents: [
              {
                historySuggestionRenderer: {
                  navigationEndpoint: { searchEndpoint: { query: "faded" } },
                  suggestion: { runs: [{ text: "faded" }] },
                  serviceEndpoint: { feedbackEndpoint: { feedbackToken: "tok123" } },
                },
              },
            ],
          },
        },
      ],
    };
    const result = parseSearchSuggestions(data, true);
    expect(result).toHaveLength(1);
    expect((result as any[])[0]["text"]).toBe("faded");
    expect((result as any[])[0]["fromHistory"]).toBe(true);
    expect((result as any[])[0]["feedbackToken"]).toBe("tok123");
  });

  it("returns empty array when no suggestions", () => {
    expect(parseSearchSuggestions({}, false)).toEqual([]);
    expect(parseSearchSuggestions({ contents: [{}] }, false)).toEqual([]);
  });
});
