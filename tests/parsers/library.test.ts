import {
  getLibraryContents,
  parseLibrarySongs,
  parsePlaylistItems,
  parsePlaylistItem,
  parseAlbums,
  parseLibraryAlbums,
  parseLibraryArtists,
  parseArtists,
} from "../../src/parsers/library.js";

function makeMRLIR(overrides: Record<string, any> = {}) {
  return {
    musicResponsiveListItemRenderer: {
      flexColumns: [
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: {
              runs: [
                {
                  text: "Song Title",
                  navigationEndpoint: { watchEndpoint: { videoId: "abc123" } },
                },
              ],
            },
          },
        },
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: {
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
          },
        },
      ],
      fixedColumns: [
        {
          musicResponsiveListItemFixedColumnRenderer: {
            text: { runs: [{ text: "3:45" }] },
          },
        },
      ],
      overlay: {
        musicItemThumbnailOverlayRenderer: {
          content: {
            musicPlayButtonRenderer: {
              playNavigationEndpoint: {
                watchEndpoint: { videoId: "abc123" },
              },
            },
          },
        },
      },
      thumbnail: {
        musicThumbnailRenderer: {
          thumbnail: {
            thumbnails: [{ url: "https://thumb.jpg", width: 60, height: 60 }],
          },
        },
      },
      ...overrides,
    },
  };
}

describe("getLibraryContents", () => {
  it("extracts contents from standard response", () => {
    const response = {
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        itemSectionRenderer: {
                          contents: [
                            {
                              musicShelfRenderer: {
                                contents: [{ item: "data" }],
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
    };
    const result = getLibraryContents(response, ["musicShelfRenderer"]);
    expect(result).toBeDefined();
    expect(result!["contents"]).toEqual([{ item: "data" }]);
  });

  it("extracts from section list item when no itemSectionRenderer", () => {
    const response = {
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicShelfRenderer: {
                          contents: [{ item: "direct" }],
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
    };
    const result = getLibraryContents(response, ["musicShelfRenderer"]);
    expect(result).toBeDefined();
    expect(result!["contents"]).toEqual([{ item: "direct" }]);
  });

  it("returns null when content is missing", () => {
    const response = {
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicShelfRenderer: {
                          contents: [],
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
    };
    const result = getLibraryContents(response, ["gridRenderer"]);
    expect(result).toBeNull();
  });
});

describe("parsePlaylistItem", () => {
  it("parses a standard song item", () => {
    const data = makeMRLIR()["musicResponsiveListItemRenderer"];
    const result = parsePlaylistItem(data);
    expect(result).not.toBeNull();
    expect(result!["videoId"]).toBe("abc123");
    expect(result!["title"]).toBe("Song Title");
    expect(result!["duration"]).toBe("3:45");
    expect(result!["duration_seconds"]).toBe(225);
    expect(result!["isAvailable"]).toBe(true);
  });

  it("returns null for deleted songs", () => {
    const data = {
      flexColumns: [
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: {
              runs: [
                {
                  text: "Song deleted",
                  navigationEndpoint: { watchEndpoint: { videoId: "del" } },
                },
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
                watchEndpoint: { videoId: "del" },
              },
            },
          },
        },
      },
    };
    expect(parsePlaylistItem(data)).toBeNull();
  });

  it("marks greyed out items as unavailable", () => {
    const mrlir = makeMRLIR({
      musicItemRendererDisplayPolicy: "MUSIC_ITEM_RENDERER_DISPLAY_POLICY_GREY_OUT",
    });
    const data = mrlir["musicResponsiveListItemRenderer"];
    const result = parsePlaylistItem(data);
    expect(result).not.toBeNull();
    expect(result!["isAvailable"]).toBe(false);
  });
});

describe("parsePlaylistItems", () => {
  it("parses a list of MRLIR items", () => {
    const items = [makeMRLIR(), makeMRLIR()];
    const result = parsePlaylistItems(items);
    expect(result).toHaveLength(2);
  });

  it("skips items without MRLIR key", () => {
    const items = [makeMRLIR(), { otherRenderer: {} }];
    const result = parsePlaylistItems(items);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(parsePlaylistItems([])).toEqual([]);
  });
});

describe("parseLibrarySongs", () => {
  it("parses library songs response", () => {
    const response = {
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicShelfRenderer: {
                          contents: [
                            { otherItem: "random mix" }, // will be shifted
                            makeMRLIR(),
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
    };
    const result = parseLibrarySongs(response);
    expect(result["parsed"]).toBeDefined();
    expect(result["results"]).toBeDefined();
    // The random mix is shifted, leaving only the real song
    expect(result["parsed"]).toHaveLength(1);
  });
});

describe("parseAlbums", () => {
  it("parses MTRIR album items", () => {
    const items = [
      {
        musicTwoRowItemRenderer: {
          title: {
            runs: [
              {
                text: "Album Title",
                navigationEndpoint: { browseEndpoint: { browseId: "MPREb_abc" } },
              },
            ],
          },
          thumbnailRenderer: {
            musicThumbnailRenderer: {
              thumbnail: {
                thumbnails: [{ url: "https://thumb.jpg", width: 226, height: 226 }],
              },
            },
          },
          subtitle: {
            runs: [
              { text: "Album" },
              { text: " \u2022 " },
              {
                text: "Artist",
                navigationEndpoint: { browseEndpoint: { browseId: "UC123" } },
              },
              { text: " \u2022 " },
              { text: "2023" },
            ],
          },
          menu: {
            menuRenderer: {
              items: [],
            },
          },
        },
      },
    ];
    const result = parseAlbums(items);
    expect(result).toHaveLength(1);
    expect(result[0]["browseId"]).toBe("MPREb_abc");
    expect(result[0]["title"]).toBe("Album Title");
    expect(result[0]["type"]).toBe("Album");
  });

  it("skips items without MTRIR key", () => {
    const items = [{ other: {} }];
    expect(parseAlbums(items)).toEqual([]);
  });
});

describe("parseArtists", () => {
  it("parses MRLIR artist items", () => {
    const items = [
      {
        musicResponsiveListItemRenderer: {
          navigationEndpoint: { browseEndpoint: { browseId: "UC123" } },
          flexColumns: [
            {
              musicResponsiveListItemFlexColumnRenderer: {
                text: { runs: [{ text: "Artist Name" }] },
              },
            },
            {
              musicResponsiveListItemFlexColumnRenderer: {
                text: { runs: [{ text: "1.5M subscribers" }] },
              },
            },
          ],
          thumbnail: {
            musicThumbnailRenderer: {
              thumbnail: {
                thumbnails: [{ url: "https://art.jpg", width: 60, height: 60 }],
              },
            },
          },
          menu: { menuRenderer: { items: [] } },
        },
      },
    ];
    const result = parseArtists(items);
    expect(result).toHaveLength(1);
    expect(result[0]["browseId"]).toBe("UC123");
    expect(result[0]["artist"]).toBe("Artist Name");
    expect(result[0]["subscribers"]).toBe("1.5M");
  });
});

describe("parseLibraryAlbums", () => {
  it("returns empty when no grid content", () => {
    const response = {
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: { contents: [{}] },
                },
              },
            },
          ],
        },
      },
    };
    const { results, albums } = parseLibraryAlbums(response);
    expect(results).toBeNull();
    expect(albums).toEqual([]);
  });
});

describe("parseLibraryArtists", () => {
  it("returns empty when no library contents", () => {
    const response = {
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [{}],
                  },
                },
              },
            },
          ],
        },
      },
    };
    const { results, artists } = parseLibraryArtists(response);
    expect(results).toBeNull();
    expect(artists).toEqual([]);
  });
});

describe("parseLibrarySongs (non-mutation)", () => {
  it("does not mutate the original response contents array", () => {
    const originalContents = [
      { randomMix: true },
      makeMRLIR(),
      makeMRLIR(),
    ];
    const response = {
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicShelfRenderer: {
                          contents: originalContents,
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
    };
    parseLibrarySongs(response);
    // Original array should still have 3 items (not mutated)
    expect(originalContents).toHaveLength(3);
  });
});
