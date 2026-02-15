import { jest } from "@jest/globals";
import { getMoodCategories, getMoodPlaylists } from "../../src/mixins/explore.js";
import type { YTMusic } from "../../src/ytmusic.js";
import type { JsonDict } from "../../src/types.js";

function createMockYtmusic(response: JsonDict): YTMusic {
  return {
    sendRequest: jest.fn().mockResolvedValue(response),
  } as unknown as YTMusic;
}

describe("getMoodCategories", () => {
  it("parses mood categories from response", async () => {
    const yt = createMockYtmusic({
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        gridRenderer: {
                          header: {
                            gridHeaderRenderer: {
                              title: { runs: [{ text: "Moods & moments" }] },
                            },
                          },
                          items: [
                            {
                              musicNavigationButtonRenderer: {
                                buttonText: { runs: [{ text: "Chill" }] },
                                clickCommand: {
                                  browseEndpoint: { params: "ggMPOg1u" },
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    });
    const result = await getMoodCategories(yt);
    expect(result["Moods & moments"]).toBeDefined();
    expect(result["Moods & moments"]).toHaveLength(1);
    expect(result["Moods & moments"][0]["title"]).toBe("Chill");
    expect(result["Moods & moments"][0]["params"]).toBe("ggMPOg1u");
  });
});

describe("getMoodPlaylists", () => {
  it("parses playlists from response sections", async () => {
    const yt = createMockYtmusic({
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicCarouselShelfRenderer: {
                          contents: [
                            {
                              musicTwoRowItemRenderer: {
                                title: {
                                  runs: [
                                    {
                                      text: "Chill Vibes",
                                      navigationEndpoint: {
                                        browseEndpoint: { browseId: "VLPL123" },
                                      },
                                    },
                                  ],
                                },
                                subtitle: {
                                  runs: [{ text: "Playlist" }],
                                },
                                thumbnailRenderer: {
                                  musicThumbnailRenderer: {
                                    thumbnail: { thumbnails: [] },
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    });
    const result = await getMoodPlaylists(yt, "ggMPOg1u");
    expect(result).toHaveLength(1);
    expect(result[0]["title"]).toBe("Chill Vibes");
    expect(result[0]["playlistId"]).toBe("PL123");
  });
});
