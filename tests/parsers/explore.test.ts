import { parseRanking, parseChartArtist } from "../../src/parsers/explore.js";

describe("parseRanking", () => {
  it("parses ranking with trend icon", () => {
    const data = {
      customIndexColumn: {
        musicCustomIndexColumnRenderer: {
          text: { runs: [{ text: "1" }] },
          icon: { iconType: "ARROW_DROP_UP" },
        },
      },
    };
    expect(parseRanking(data, false)).toEqual({ rank: "1", trend: "up" });
  });

  it("parses ranking with neutral trend", () => {
    const data = {
      customIndexColumn: {
        musicCustomIndexColumnRenderer: {
          text: { runs: [{ text: "5" }] },
          icon: { iconType: "ARROW_CHART_NEUTRAL" },
        },
      },
    };
    expect(parseRanking(data, false)).toEqual({ rank: "5", trend: "neutral" });
  });

  it("returns null when noneIfAbsent and missing", () => {
    const data = {};
    expect(parseRanking(data, true)).toEqual({ rank: null, trend: null });
  });
});

describe("parseChartArtist", () => {
  it("parses a chart artist", () => {
    const data = {
      flexColumns: [
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: { runs: [{ text: "Drake" }] },
          },
        },
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: { runs: [{ text: "50M subscribers" }] },
          },
        },
      ],
      navigationEndpoint: { browseEndpoint: { browseId: "UC1" } },
      thumbnail: { musicThumbnailRenderer: { thumbnail: { thumbnails: [] } } },
      customIndexColumn: {
        musicCustomIndexColumnRenderer: {
          text: { runs: [{ text: "1" }] },
          icon: { iconType: "ARROW_DROP_UP" },
        },
      },
    };
    const result = parseChartArtist(data);
    expect(result["title"]).toBe("Drake");
    expect(result["browseId"]).toBe("UC1");
    expect(result["subscribers"]).toBe("50M");
    expect(result["rank"]).toBe("1");
    expect(result["trend"]).toBe("up");
  });
});
