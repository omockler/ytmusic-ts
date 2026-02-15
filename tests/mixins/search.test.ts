import { jest } from "@jest/globals";
import { search, getSearchSuggestions } from "../../src/mixins/search.js";
import type { YTMusic } from "../../src/ytmusic.js";
import type { JsonDict } from "../../src/types.js";

function createMockYtmusic(response: JsonDict): YTMusic {
  return {
    sendRequest: jest.fn().mockResolvedValue(response),
  } as unknown as YTMusic;
}

describe("search", () => {
  it("returns empty array when no contents in response", async () => {
    const yt = createMockYtmusic({});
    const result = await search(yt, "test query");
    expect(result).toEqual([]);
  });

  it("returns empty array for empty section list", async () => {
    const yt = createMockYtmusic({
      contents: {
        sectionListRenderer: {
          contents: [{ itemSectionRenderer: { contents: [{}] } }],
        },
      },
    });
    const result = await search(yt, "test query");
    expect(result).toEqual([]);
  });

  it("throws on invalid filter", async () => {
    const yt = createMockYtmusic({});
    await expect(search(yt, "test", "invalid_filter")).rejects.toThrow("Invalid filter");
  });

  it("throws on invalid scope", async () => {
    const yt = createMockYtmusic({});
    await expect(search(yt, "test", null, "invalid_scope")).rejects.toThrow("Invalid scope");
  });

  it("throws when filter set with uploads scope", async () => {
    const yt = createMockYtmusic({});
    await expect(search(yt, "test", "songs", "uploads")).rejects.toThrow("No filter can be set");
  });

  it("parses musicShelfRenderer results", async () => {
    const yt = createMockYtmusic({
      contents: {
        sectionListRenderer: {
          contents: [
            {
              musicShelfRenderer: {
                title: { runs: [{ text: "Songs" }] },
                contents: [
                  {
                    musicResponsiveListItemRenderer: {
                      flexColumns: [
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: { runs: [{ text: "Test Song" }] },
                          },
                        },
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: {
                              runs: [
                                { text: "Song" },
                                { text: " \u2022 " },
                                { text: "Artist" },
                                { text: " \u2022 " },
                                { text: "3:00" },
                              ],
                            },
                          },
                        },
                      ],
                      overlay: {
                        musicItemThumbnailOverlayRenderer: {
                          content: {
                            musicPlayButtonRenderer: {
                              playNavigationEndpoint: {
                                watchEndpoint: {
                                  videoId: "vid1",
                                  watchEndpointMusicSupportedConfigs: {
                                    watchEndpointMusicConfig: {
                                      musicVideoType: "MUSIC_VIDEO_TYPE_ATV",
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      thumbnail: {
                        musicThumbnailRenderer: { thumbnail: { thumbnails: [] } },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
    const result = await search(yt, "test song", "songs");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]["title"]).toBe("Test Song");
    expect(result[0]["category"]).toBe("Songs");
  });
});

describe("getSearchSuggestions", () => {
  it("returns suggestions", async () => {
    const yt = createMockYtmusic({
      contents: [
        {
          searchSuggestionsSectionRenderer: {
            contents: [
              {
                searchSuggestionRenderer: {
                  navigationEndpoint: { searchEndpoint: { query: "test" } },
                  suggestion: { runs: [{ text: "test" }] },
                },
              },
            ],
          },
        },
      ],
    });
    const result = await getSearchSuggestions(yt, "tes");
    expect(result).toEqual(["test"]);
  });
});
