import {
  parseSongRun,
  parseSongRuns,
  parseSongArtists,
  parseSongAlbum,
  parseLikeStatus,
} from "../../src/parsers/songs.js";

describe("parseSongRun", () => {
  it("identifies artist with navigation endpoint", () => {
    const run = {
      text: "Oasis",
      navigationEndpoint: { browseEndpoint: { browseId: "UC123" } },
    };
    expect(parseSongRun(run)).toEqual({
      type: "artist",
      data: { name: "Oasis", id: "UC123" },
    });
  });

  it("identifies album with MPRE browseId", () => {
    const run = {
      text: "Morning Glory",
      navigationEndpoint: { browseEndpoint: { browseId: "MPREb_abc" } },
    };
    expect(parseSongRun(run)).toEqual({
      type: "album",
      data: { name: "Morning Glory", id: "MPREb_abc" },
    });
  });

  it("identifies views", () => {
    expect(parseSongRun({ text: "1.4M views" })).toEqual({
      type: "views",
      data: "1.4M",
    });
  });

  it("identifies duration", () => {
    expect(parseSongRun({ text: "4:38" })).toEqual({
      type: "duration",
      data: "4:38",
    });
  });

  it("identifies year", () => {
    expect(parseSongRun({ text: "2017" })).toEqual({
      type: "year",
      data: "2017",
    });
  });

  it("falls back to artist without id", () => {
    expect(parseSongRun({ text: "Unknown" })).toEqual({
      type: "artist",
      data: { name: "Unknown", id: null },
    });
  });
});

describe("parseSongRuns", () => {
  it("parses a typical song subtitle", () => {
    const runs = [
      { text: "Oasis", navigationEndpoint: { browseEndpoint: { browseId: "UC123" } } },
      { text: " \u2022 " },
      { text: "Morning Glory", navigationEndpoint: { browseEndpoint: { browseId: "MPREb_abc" } } },
      { text: " \u2022 " },
      { text: "4:38" },
    ];
    const result = parseSongRuns(runs);
    expect(result["artists"]).toEqual([{ name: "Oasis", id: "UC123" }]);
    expect(result["album"]).toEqual({ name: "Morning Glory", id: "MPREb_abc" });
    expect(result["duration"]).toBe("4:38");
    expect(result["duration_seconds"]).toBe(278);
  });

  it("skips type specifier when skipTypeSpec is true", () => {
    const runs = [
      { text: "Song" }, // type spec
      { text: " \u2022 " },
      { text: "Oasis", navigationEndpoint: { browseEndpoint: { browseId: "UC123" } } },
      { text: " \u2022 " },
      { text: "4:00" },
    ];
    const result = parseSongRuns(runs, true);
    expect(result["artists"]).toEqual([{ name: "Oasis", id: "UC123" }]);
    expect(result["duration"]).toBe("4:00");
  });

  it("does not skip type specifier when flag is false", () => {
    const runs = [
      { text: "Song" },
      { text: " \u2022 " },
      { text: "Oasis", navigationEndpoint: { browseEndpoint: { browseId: "UC123" } } },
    ];
    const result = parseSongRuns(runs, false);
    expect(result["artists"]).toHaveLength(2);
  });
});

describe("parseSongArtists", () => {
  it("extracts artists from flex column", () => {
    const data = {
      flexColumns: [
        { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: "Title" }] } } },
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: {
              runs: [
                { text: "Artist1", navigationEndpoint: { browseEndpoint: { browseId: "UC1" } } },
                { text: " & " },
                { text: "Artist2", navigationEndpoint: { browseEndpoint: { browseId: "UC2" } } },
              ],
            },
          },
        },
      ],
    };
    const result = parseSongArtists(data, 1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Artist1", id: "UC1" });
    expect(result[1]).toEqual({ name: "Artist2", id: "UC2" });
  });

  it("returns empty array when flex column missing", () => {
    expect(parseSongArtists({ flexColumns: [] }, 0)).toEqual([]);
  });
});

describe("parseSongAlbum", () => {
  it("extracts album name and id", () => {
    const data = {
      flexColumns: [
        { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: "Title" }] } } },
        { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: "Artist" }] } } },
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: {
              runs: [
                {
                  text: "Album Name",
                  navigationEndpoint: { browseEndpoint: { browseId: "MPREb_xyz" } },
                },
              ],
            },
          },
        },
      ],
    };
    expect(parseSongAlbum(data, 2)).toEqual({ name: "Album Name", id: "MPREb_xyz" });
  });

  it("returns null when flex column is missing", () => {
    expect(parseSongAlbum({ flexColumns: [] }, 0)).toBeNull();
  });
});

describe("parseLikeStatus", () => {
  it("toggles LIKE to INDIFFERENT", () => {
    expect(parseLikeStatus({ likeEndpoint: { status: "LIKE" } })).toBe("INDIFFERENT");
  });

  it("toggles INDIFFERENT to LIKE", () => {
    expect(parseLikeStatus({ likeEndpoint: { status: "INDIFFERENT" } })).toBe("LIKE");
  });
});
