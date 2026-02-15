import { validatePlaylistId, parsePlaylistHeaderMeta, sumTotalDuration } from "../../src/parsers/playlists.js";

describe("validatePlaylistId", () => {
  it("strips VL prefix", () => {
    expect(validatePlaylistId("VLPLtest123")).toBe("PLtest123");
  });

  it("returns id unchanged when no VL prefix", () => {
    expect(validatePlaylistId("PLtest123")).toBe("PLtest123");
  });
});

describe("parsePlaylistHeaderMeta", () => {
  it("parses title and thumbnails", () => {
    const header = {
      title: { runs: [{ text: "My Playlist" }] },
      thumbnail: {
        musicThumbnailRenderer: {
          thumbnail: {
            thumbnails: [{ url: "https://thumb.jpg", width: 226, height: 226 }],
          },
        },
      },
      secondSubtitle: {
        runs: [
          { text: "50 songs" },
          { text: " \u2022 " },
          { text: "3 hours" },
        ],
      },
    };

    const result = parsePlaylistHeaderMeta(header);
    expect(result["title"]).toBe("My Playlist");
    expect(result["thumbnails"]).toHaveLength(1);
    expect(result["trackCount"]).toBe(50);
    expect(result["duration"]).toBe("3 hours");
    expect(result["views"]).toBeNull();
  });

  it("parses views when present (5+ runs)", () => {
    const header = {
      title: { runs: [{ text: "Popular" }] },
      thumbnail: {
        musicThumbnailRenderer: {
          thumbnail: { thumbnails: [] },
        },
      },
      secondSubtitle: {
        runs: [
          { text: "1,234" },
          { text: " views" },
          { text: "10 songs" },
          { text: " \u2022 " },
          { text: "45 minutes" },
        ],
      },
    };

    const result = parsePlaylistHeaderMeta(header);
    expect(result["views"]).toBe(1234);
    expect(result["trackCount"]).toBe(10);
    expect(result["duration"]).toBe("45 minutes");
  });

  it("parses author from facepile", () => {
    const header = {
      title: { runs: [{ text: "Test" }] },
      thumbnail: { musicThumbnailRenderer: { thumbnail: { thumbnails: [] } } },
      secondSubtitle: { runs: [{ text: "0 songs" }] },
      facepile: {
        avatarStackViewModel: {
          text: { content: "John Doe" },
          rendererContext: {
            commandContext: {
              onTap: {
                innertubeCommand: {
                  browseEndpoint: { browseId: "UC123" },
                },
              },
            },
            accessibilityContext: { label: "John Doe" },
          },
        },
      },
    };

    const result = parsePlaylistHeaderMeta(header);
    expect(result["author"]).toEqual({ name: "John Doe", id: "UC123" });
  });

  it("parses collaborators from facepile", () => {
    const header = {
      title: { runs: [{ text: "Collab" }] },
      thumbnail: { musicThumbnailRenderer: { thumbnail: { thumbnails: [] } } },
      secondSubtitle: { runs: [{ text: "5 songs" }] },
      facepile: {
        avatarStackViewModel: {
          avatars: [
            { avatarViewModel: { image: { sources: [{ url: "https://a1.jpg" }] } } },
            { avatarViewModel: { image: { sources: [{ url: "https://a2.jpg" }] } } },
          ],
          rendererContext: {
            commandContext: {
              onTap: {
                innertubeCommand: {
                  showEngagementPanelEndpoint: {
                    identifier: { tag: "PAplaylist_collaborate" },
                  },
                },
              },
            },
            accessibilityContext: { label: "by Author and 1 other" },
          },
        },
      },
    };

    const result = parsePlaylistHeaderMeta(header);
    expect(result["collaborators"]).toEqual({
      text: "by Author and 1 other",
      avatars: [{ url: "https://a1.jpg" }, { url: "https://a2.jpg" }],
    });
  });
});

describe("sumTotalDuration", () => {
  it("sums duration_seconds from tracks", () => {
    const item = {
      tracks: [
        { duration_seconds: 180 },
        { duration_seconds: 240 },
        { duration_seconds: 60 },
      ],
    };
    expect(sumTotalDuration(item)).toBe(480);
  });

  it("returns 0 when no tracks", () => {
    expect(sumTotalDuration({})).toBe(0);
  });

  it("handles missing duration_seconds", () => {
    const item = {
      tracks: [
        { duration_seconds: 100 },
        { title: "no duration" },
      ],
    };
    expect(sumTotalDuration(item)).toBe(100);
  });
});
