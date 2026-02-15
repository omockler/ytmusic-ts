import {
  parseAlbum,
  parseSingle,
  parseSong,
  parseVideo,
  parsePlaylist,
  parseRelatedArtist,
  parseContentList,
  parseMixedContent,
} from "../../src/parsers/browsing.js";

describe("parseAlbum", () => {
  it("parses an album result", () => {
    const data = {
      title: {
        runs: [
          {
            text: "Album Title",
            navigationEndpoint: { browseEndpoint: { browseId: "MPREb_abc" } },
          },
        ],
      },
      subtitle: {
        runs: [
          { text: "Album" },
          { text: " \u2022 " },
          { text: "2023" },
          { text: " \u2022 " },
          { text: "Artist", navigationEndpoint: { browseEndpoint: { browseId: "UC1" } } },
        ],
      },
      thumbnailRenderer: {
        musicThumbnailRenderer: {
          thumbnail: { thumbnails: [{ url: "https://img.jpg", width: 226, height: 226 }] },
        },
      },
      thumbnailOverlay: {
        musicItemThumbnailOverlayRenderer: {
          content: {
            musicPlayButtonRenderer: {
              playNavigationEndpoint: {
                watchPlaylistEndpoint: { playlistId: "OLAK5uy_abc" },
              },
            },
          },
        },
      },
    };
    const result = parseAlbum(data);
    expect(result["title"]).toBe("Album Title");
    expect(result["type"]).toBe("Album");
    expect(result["browseId"]).toBe("MPREb_abc");
    expect(result["audioPlaylistId"]).toBe("OLAK5uy_abc");
    expect(result["isExplicit"]).toBe(false);
    expect(result["artists"]).toEqual([{ id: "UC1", name: "Artist" }]);
    expect(result["year"]).toBe("2023");
  });
});

describe("parseSingle", () => {
  it("parses a single result", () => {
    const data = {
      title: {
        runs: [
          {
            text: "Single Title",
            navigationEndpoint: { browseEndpoint: { browseId: "MPREb_xyz" } },
          },
        ],
      },
      subtitle: { runs: [{ text: "2022" }] },
      thumbnailRenderer: {
        musicThumbnailRenderer: {
          thumbnail: { thumbnails: [] },
        },
      },
    };
    const result = parseSingle(data);
    expect(result["title"]).toBe("Single Title");
    expect(result["year"]).toBe("2022");
    expect(result["browseId"]).toBe("MPREb_xyz");
  });
});

describe("parseSong", () => {
  it("parses a song from two-row item", () => {
    const data = {
      title: { runs: [{ text: "Song Title" }] },
      navigationEndpoint: { watchEndpoint: { videoId: "vid123", playlistId: "PL123" } },
      subtitle: {
        runs: [
          { text: "Song" },
          { text: " \u2022 " },
          { text: "Artist" },
        ],
      },
      thumbnailRenderer: {
        musicThumbnailRenderer: { thumbnail: { thumbnails: [] } },
      },
    };
    const result = parseSong(data);
    expect(result["title"]).toBe("Song Title");
    expect(result["videoId"]).toBe("vid123");
    expect(result["playlistId"]).toBe("PL123");
  });
});

describe("parseVideo", () => {
  it("parses a video result", () => {
    const data = {
      title: { runs: [{ text: "Video Title" }] },
      navigationEndpoint: {
        watchEndpoint: { videoId: "vid456", playlistId: "RD456" },
      },
      subtitle: {
        runs: [
          { text: "Artist Name" },
          { text: " \u2022 " },
          { text: "2.1M views" },
        ],
      },
      thumbnailRenderer: {
        musicThumbnailRenderer: { thumbnail: { thumbnails: [] } },
      },
      menu: { menuRenderer: { items: [] } },
    };
    const result = parseVideo(data);
    expect(result["title"]).toBe("Video Title");
    expect(result["videoId"]).toBe("vid456");
    expect(result["artists"]).toEqual([{ name: "Artist Name", id: null }]);
    expect(result["views"]).toBe("2.1M");
  });
});

describe("parsePlaylist", () => {
  it("parses a playlist result", () => {
    const data = {
      title: {
        runs: [
          {
            text: "My Playlist",
            navigationEndpoint: { browseEndpoint: { browseId: "VLPL123" } },
          },
        ],
      },
      subtitle: {
        runs: [
          { text: "Playlist" },
          { text: " \u2022 " },
          { text: "50 songs" },
        ],
      },
      thumbnailRenderer: {
        musicThumbnailRenderer: { thumbnail: { thumbnails: [] } },
      },
    };
    const result = parsePlaylist(data);
    expect(result["title"]).toBe("My Playlist");
    expect(result["playlistId"]).toBe("PL123");
    expect(result["description"]).toBe("Playlist \u2022 50 songs");
  });
});

describe("parseRelatedArtist", () => {
  it("parses a related artist", () => {
    const data = {
      title: {
        runs: [
          {
            text: "Related Artist",
            navigationEndpoint: { browseEndpoint: { browseId: "UC789" } },
          },
        ],
      },
      subtitle: { runs: [{ text: "100K subscribers" }] },
      thumbnailRenderer: {
        musicThumbnailRenderer: { thumbnail: { thumbnails: [] } },
      },
    };
    const result = parseRelatedArtist(data);
    expect(result["title"]).toBe("Related Artist");
    expect(result["browseId"]).toBe("UC789");
    expect(result["subscribers"]).toBe("100K");
  });
});

describe("parseContentList", () => {
  it("maps items through parse function", () => {
    const items = [
      {
        musicTwoRowItemRenderer: {
          title: {
            runs: [
              {
                text: "Item",
                navigationEndpoint: { browseEndpoint: { browseId: "UC1" } },
              },
            ],
          },
          subtitle: { runs: [{ text: "Sub" }] },
          thumbnailRenderer: {
            musicThumbnailRenderer: { thumbnail: { thumbnails: [] } },
          },
        },
      },
    ];
    const result = parseContentList(items, parseRelatedArtist);
    expect(result).toHaveLength(1);
    expect(result[0]["title"]).toBe("Item");
  });
});

describe("parseMixedContent", () => {
  it("parses carousel rows", () => {
    const rows = [
      {
        musicCarouselShelfRenderer: {
          header: {
            musicCarouselShelfBasicHeaderRenderer: {
              title: { runs: [{ text: "Section Title" }] },
            },
          },
          contents: [
            {
              musicTwoRowItemRenderer: {
                title: {
                  runs: [
                    {
                      text: "Artist Name",
                      navigationEndpoint: {
                        browseEndpoint: {
                          browseId: "UC123",
                          browseEndpointContextSupportedConfigs: {
                            browseEndpointContextMusicConfig: {
                              pageType: "MUSIC_PAGE_TYPE_ARTIST",
                            },
                          },
                        },
                      },
                    },
                  ],
                },
                subtitle: { runs: [{ text: "100K subscribers" }] },
                thumbnailRenderer: {
                  musicThumbnailRenderer: { thumbnail: { thumbnails: [] } },
                },
              },
            },
          ],
        },
      },
    ];
    const result = parseMixedContent(rows);
    expect(result).toHaveLength(1);
    expect(result[0]["title"]).toBe("Section Title");
    expect(result[0]["contents"]).toHaveLength(1);
  });
});
