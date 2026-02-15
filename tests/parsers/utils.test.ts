import {
  parseDuration,
  getItemText,
  getFlexColumnItem,
  getFixedColumnItem,
  getDotSeparatorIndex,
  parseIdName,
  parseMenuPlaylists,
  DOT_SEPARATOR_RUN,
} from "../../src/parsers/utils.js";

describe("parseDuration", () => {
  it("parses mm:ss format", () => {
    expect(parseDuration("4:38")).toBe(278);
  });

  it("parses hh:mm:ss format", () => {
    expect(parseDuration("1:17:00")).toBe(4620);
  });

  it("parses ss only", () => {
    expect(parseDuration("0:45")).toBe(45);
  });

  it("returns null for null/empty input", () => {
    expect(parseDuration(null)).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration(" ")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseDuration("2,343")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseDuration(" 3:00 ")).toBe(180);
  });
});

describe("getFlexColumnItem", () => {
  it("returns column renderer when valid", () => {
    const item = {
      flexColumns: [
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: { runs: [{ text: "Title" }] },
          },
        },
      ],
    };
    const result = getFlexColumnItem(item, 0);
    expect(result).toEqual({
      text: { runs: [{ text: "Title" }] },
    });
  });

  it("returns null when index out of bounds", () => {
    const item = { flexColumns: [] };
    expect(getFlexColumnItem(item, 0)).toBeNull();
  });

  it("returns null when text is missing", () => {
    const item = {
      flexColumns: [
        { musicResponsiveListItemFlexColumnRenderer: {} },
      ],
    };
    expect(getFlexColumnItem(item, 0)).toBeNull();
  });

  it("returns null when runs are missing", () => {
    const item = {
      flexColumns: [
        { musicResponsiveListItemFlexColumnRenderer: { text: {} } },
      ],
    };
    expect(getFlexColumnItem(item, 0)).toBeNull();
  });
});

describe("getFixedColumnItem", () => {
  it("returns column renderer when valid", () => {
    const item = {
      fixedColumns: [
        {
          musicResponsiveListItemFixedColumnRenderer: {
            text: { runs: [{ text: "3:45" }] },
          },
        },
      ],
    };
    expect(getFixedColumnItem(item, 0)).toEqual({
      text: { runs: [{ text: "3:45" }] },
    });
  });

  it("returns null when text is missing", () => {
    const item = {
      fixedColumns: [{ musicResponsiveListItemFixedColumnRenderer: {} }],
    };
    expect(getFixedColumnItem(item, 0)).toBeNull();
  });
});

describe("getItemText", () => {
  it("returns text from flex column", () => {
    const item = {
      flexColumns: [
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: { runs: [{ text: "Song Title" }, { text: " - " }, { text: "Artist" }] },
          },
        },
      ],
    };
    expect(getItemText(item, 0)).toBe("Song Title");
    expect(getItemText(item, 0, 2)).toBe("Artist");
  });

  it("returns null when column does not exist", () => {
    const item = { flexColumns: [] };
    expect(getItemText(item, 5)).toBeNull();
  });

  it("returns null when noneIfAbsent and run index out of range", () => {
    const item = {
      flexColumns: [
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: { runs: [{ text: "Only" }] },
          },
        },
      ],
    };
    expect(getItemText(item, 0, 5, true)).toBeNull();
  });
});

describe("getDotSeparatorIndex", () => {
  it("finds dot separator", () => {
    const runs = [
      { text: "Artist" },
      DOT_SEPARATOR_RUN,
      { text: "Album" },
    ];
    expect(getDotSeparatorIndex(runs)).toBe(1);
  });

  it("returns array length when no separator", () => {
    const runs = [{ text: "Artist" }, { text: "Album" }];
    expect(getDotSeparatorIndex(runs)).toBe(2);
  });
});

describe("parseIdName", () => {
  it("extracts id and name from run with navigation", () => {
    const run = {
      text: "Artist Name",
      navigationEndpoint: { browseEndpoint: { browseId: "UC123" } },
    };
    expect(parseIdName(run)).toEqual({ id: "UC123", name: "Artist Name" });
  });

  it("handles null input", () => {
    expect(parseIdName(null)).toEqual({ id: null, name: null });
  });
});

describe("parseMenuPlaylists", () => {
  it("extracts shuffle and radio IDs from menu", () => {
    const data = {
      menu: {
        menuRenderer: {
          items: [
            {
              menuNavigationItemRenderer: {
                icon: { iconType: "MUSIC_SHUFFLE" },
                navigationEndpoint: {
                  watchPlaylistEndpoint: { playlistId: "RDAO123" },
                },
              },
            },
            {
              menuNavigationItemRenderer: {
                icon: { iconType: "MIX" },
                navigationEndpoint: {
                  watchPlaylistEndpoint: { playlistId: "RDEM456" },
                },
              },
            },
          ],
        },
      },
    };
    const result: Record<string, unknown> = {};
    parseMenuPlaylists(data, result);
    expect(result["shuffleId"]).toBe("RDAO123");
    expect(result["radioId"]).toBe("RDEM456");
  });

  it("handles missing menu items gracefully", () => {
    const result: Record<string, unknown> = {};
    parseMenuPlaylists({}, result);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
