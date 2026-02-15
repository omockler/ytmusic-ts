import { jest } from "@jest/globals";
import {
  getAccountInfo,
  rateSong,
  ratePlaylist,
  editSongLibraryStatus,
  removeHistoryItems,
  subscribeArtists,
  unsubscribeArtists,
  getLibraryPlaylists,
  getLibrarySongs,
  getLibraryAlbums,
  getLibraryArtists,
  getLibrarySubscriptions,
  getLibraryPodcasts,
  getLibraryChannels,
  getHistory,
  addHistoryItem,
  getLikedSongs,
} from "../../src/mixins/library.js";
import type { YTMusic } from "../../src/ytmusic.js";
import type { JsonDict } from "../../src/types.js";

function createMockYtmusic(response: JsonDict): YTMusic {
  return {
    sendRequest: jest.fn().mockResolvedValue(response),
    sendGetRequest: jest.fn().mockResolvedValue({}),
    checkAuth: jest.fn(),
  } as unknown as YTMusic;
}

function createUnauthYtmusic(): YTMusic {
  return {
    sendRequest: jest.fn(),
    sendGetRequest: jest.fn(),
    checkAuth: jest.fn(() => {
      throw new Error("Please provide authentication before using this function");
    }),
  } as unknown as YTMusic;
}

function makeLibraryBrowseResponse(renderer: string, contents: any[]) {
  return {
    contents: {
      singleColumnBrowseResultsRenderer: {
        tabs: [
          {
            tabRenderer: {
              content: {
                sectionListRenderer: {
                  contents: [
                    {
                      [renderer]: {
                        contents,
                        items: contents,
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
}

function makeMRLIRSong(videoId: string, title: string) {
  return {
    musicResponsiveListItemRenderer: {
      flexColumns: [
        {
          musicResponsiveListItemFlexColumnRenderer: {
            text: {
              runs: [
                {
                  text: title,
                  navigationEndpoint: { watchEndpoint: { videoId } },
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
                  text: "Artist",
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
            text: { runs: [{ text: "3:00" }] },
          },
        },
      ],
      overlay: {
        musicItemThumbnailOverlayRenderer: {
          content: {
            musicPlayButtonRenderer: {
              playNavigationEndpoint: {
                watchEndpoint: { videoId },
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
    },
  };
}

// --- Auth enforcement ---

describe("auth enforcement", () => {
  const unauthYt = createUnauthYtmusic();
  const authFunctions = [
    ["getAccountInfo", () => getAccountInfo(unauthYt)],
    ["rateSong", () => rateSong(unauthYt, "vid", "LIKE")],
    ["ratePlaylist", () => ratePlaylist(unauthYt, "pl", "LIKE")],
    ["editSongLibraryStatus", () => editSongLibraryStatus(unauthYt, ["token"])],
    ["removeHistoryItems", () => removeHistoryItems(unauthYt, ["token"])],
    ["subscribeArtists", () => subscribeArtists(unauthYt, ["UC123"])],
    ["unsubscribeArtists", () => unsubscribeArtists(unauthYt, ["UC123"])],
    ["getLibraryPlaylists", () => getLibraryPlaylists(unauthYt)],
    ["getLibrarySongs", () => getLibrarySongs(unauthYt)],
    ["getLibraryAlbums", () => getLibraryAlbums(unauthYt)],
    ["getLibraryArtists", () => getLibraryArtists(unauthYt)],
    ["getLibrarySubscriptions", () => getLibrarySubscriptions(unauthYt)],
    ["getLibraryPodcasts", () => getLibraryPodcasts(unauthYt)],
    ["getLibraryChannels", () => getLibraryChannels(unauthYt)],
    ["getHistory", () => getHistory(unauthYt)],
    ["addHistoryItem", () => addHistoryItem(unauthYt, "vid")],
    ["getLikedSongs", () => getLikedSongs(unauthYt)],
  ] as const;

  it.each(authFunctions)("%s requires authentication", async (_name, fn) => {
    await expect(fn()).rejects.toThrow("authentication");
  });
});

// --- Simple endpoints ---

describe("getAccountInfo", () => {
  it("returns account name, handle, and photo", async () => {
    const yt = createMockYtmusic({
      actions: [
        {
          openPopupAction: {
            popup: {
              multiPageMenuRenderer: {
                header: {
                  activeAccountHeaderRenderer: {
                    accountName: { runs: [{ text: "Test User" }] },
                    channelHandle: { runs: [{ text: "@testuser" }] },
                    accountPhoto: {
                      thumbnails: [{ url: "https://photo.jpg" }],
                    },
                  },
                },
              },
            },
          },
        },
      ],
    });
    const result = await getAccountInfo(yt);
    expect(result["accountName"]).toBe("Test User");
    expect(result["channelHandle"]).toBe("@testuser");
    expect(result["accountPhotoUrl"]).toBe("https://photo.jpg");
  });
});

describe("rateSong", () => {
  it("sends like request with correct endpoint", async () => {
    const yt = createMockYtmusic({ success: true });
    await rateSong(yt, "video123", "LIKE");
    expect(yt.sendRequest).toHaveBeenCalledWith("like/like", {
      target: { videoId: "video123" },
    });
  });

  it("sends dislike request", async () => {
    const yt = createMockYtmusic({ success: true });
    await rateSong(yt, "video123", "DISLIKE");
    expect(yt.sendRequest).toHaveBeenCalledWith("like/dislike", {
      target: { videoId: "video123" },
    });
  });

  it("sends removelike for INDIFFERENT", async () => {
    const yt = createMockYtmusic({ success: true });
    await rateSong(yt, "video123", "INDIFFERENT");
    expect(yt.sendRequest).toHaveBeenCalledWith("like/removelike", {
      target: { videoId: "video123" },
    });
  });

  it("throws on invalid rating", async () => {
    const yt = createMockYtmusic({});
    await expect(rateSong(yt, "vid", "INVALID" as any)).rejects.toThrow("Invalid rating");
  });
});

describe("ratePlaylist", () => {
  it("sends like request for playlist", async () => {
    const yt = createMockYtmusic({ success: true });
    await ratePlaylist(yt, "PL123", "LIKE");
    expect(yt.sendRequest).toHaveBeenCalledWith("like/like", {
      target: { playlistId: "PL123" },
    });
  });
});

describe("editSongLibraryStatus", () => {
  it("sends feedback tokens", async () => {
    const yt = createMockYtmusic({ success: true });
    await editSongLibraryStatus(yt, ["token1", "token2"]);
    expect(yt.sendRequest).toHaveBeenCalledWith("feedback", {
      feedbackTokens: ["token1", "token2"],
    });
  });
});

describe("removeHistoryItems", () => {
  it("sends feedback tokens", async () => {
    const yt = createMockYtmusic({ success: true });
    await removeHistoryItems(yt, ["token1"]);
    expect(yt.sendRequest).toHaveBeenCalledWith("feedback", {
      feedbackTokens: ["token1"],
    });
  });
});

describe("subscribeArtists", () => {
  it("sends channel ids", async () => {
    const yt = createMockYtmusic({ success: true });
    await subscribeArtists(yt, ["UC1", "UC2"]);
    expect(yt.sendRequest).toHaveBeenCalledWith("subscription/subscribe", {
      channelIds: ["UC1", "UC2"],
    });
  });
});

describe("unsubscribeArtists", () => {
  it("sends channel ids", async () => {
    const yt = createMockYtmusic({ success: true });
    await unsubscribeArtists(yt, ["UC1"]);
    expect(yt.sendRequest).toHaveBeenCalledWith("subscription/unsubscribe", {
      channelIds: ["UC1"],
    });
  });
});

// --- Paginated endpoints ---

describe("getLibrarySongs", () => {
  it("returns parsed songs", async () => {
    const response = makeLibraryBrowseResponse("musicShelfRenderer", [
      { randomMix: true }, // will be shifted off
      makeMRLIRSong("v1", "Song 1"),
      makeMRLIRSong("v2", "Song 2"),
    ]);
    const yt = createMockYtmusic(response);
    const result = await getLibrarySongs(yt);
    expect(result).toHaveLength(2);
    expect(result[0]["videoId"]).toBe("v1");
    expect(result[1]["videoId"]).toBe("v2");
  });

  it("returns empty array when no contents", async () => {
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
    const yt = createMockYtmusic(response);
    const result = await getLibrarySongs(yt);
    expect(result).toEqual([]);
  });

  it("rejects invalid order parameter", async () => {
    const yt = createMockYtmusic({});
    await expect(getLibrarySongs(yt, 25, "invalid" as any)).rejects.toThrow("Invalid order");
  });
});

describe("getLibraryAlbums", () => {
  it("returns empty when no grid content", async () => {
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
    const yt = createMockYtmusic(response);
    const result = await getLibraryAlbums(yt);
    expect(result).toEqual([]);
  });
});

describe("getLibraryArtists", () => {
  it("returns empty when no music shelf content", async () => {
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
    const yt = createMockYtmusic(response);
    const result = await getLibraryArtists(yt);
    expect(result).toEqual([]);
  });
});

describe("getLibraryPlaylists", () => {
  it("returns empty when no grid content", async () => {
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
    const yt = createMockYtmusic(response);
    const result = await getLibraryPlaylists(yt);
    expect(result).toEqual([]);
  });
});

describe("getLibrarySubscriptions", () => {
  it("returns empty when no music shelf content", async () => {
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
    const yt = createMockYtmusic(response);
    const result = await getLibrarySubscriptions(yt);
    expect(result).toEqual([]);
  });

  it("parses subscription artists", async () => {
    const response = makeLibraryBrowseResponse("musicShelfRenderer", [
      {
        musicResponsiveListItemRenderer: {
          navigationEndpoint: { browseEndpoint: { browseId: "UC123" } },
          flexColumns: [
            {
              musicResponsiveListItemFlexColumnRenderer: {
                text: { runs: [{ text: "Artist A" }] },
              },
            },
            {
              musicResponsiveListItemFlexColumnRenderer: {
                text: { runs: [{ text: "500K subscribers" }] },
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
    ]);
    const yt = createMockYtmusic(response);
    const result = await getLibrarySubscriptions(yt);
    expect(result).toHaveLength(1);
    expect(result[0]["artist"]).toBe("Artist A");
    expect(result[0]["subscribers"]).toBe("500K");
  });
});

describe("getLibraryPodcasts", () => {
  it("returns empty when no grid content", async () => {
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
    const yt = createMockYtmusic(response);
    const result = await getLibraryPodcasts(yt);
    expect(result).toEqual([]);
  });
});

describe("getLibraryChannels", () => {
  it("returns empty when no music shelf content", async () => {
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
    const yt = createMockYtmusic(response);
    const result = await getLibraryChannels(yt);
    expect(result).toEqual([]);
  });
});

// --- History ---

describe("getHistory", () => {
  it("parses history sections with played timestamps", async () => {
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
                          title: { runs: [{ text: "Today" }] },
                          contents: [makeMRLIRSong("v1", "Song 1")],
                        },
                      },
                      {
                        musicShelfRenderer: {
                          title: { runs: [{ text: "Yesterday" }] },
                          contents: [makeMRLIRSong("v2", "Song 2")],
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
    const yt = createMockYtmusic(response);
    const result = await getHistory(yt);
    expect(result).toHaveLength(2);
    expect(result[0]["played"]).toBe("Today");
    expect(result[0]["videoId"]).toBe("v1");
    expect(result[1]["played"]).toBe("Yesterday");
  });
});

describe("addHistoryItem", () => {
  it("calls getSong when given a videoId string", async () => {
    const mockSendRequest = jest.fn();
    mockSendRequest.mockResolvedValue({
      videoDetails: {},
      playabilityStatus: {},
      playbackTracking: {
        videostatsPlaybackUrl: {
          baseUrl: "https://s.youtube.com/api/stats/playback?ei=abc",
        },
      },
    });

    const yt = {
      sendRequest: mockSendRequest,
      sendGetRequest: jest.fn().mockResolvedValue({ status: 204 }),
      checkAuth: jest.fn(),
    } as unknown as YTMusic;

    await addHistoryItem(yt, "vid123");

    expect(yt.sendGetRequest).toHaveBeenCalledTimes(1);
    const url = (yt.sendGetRequest as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain("https://s.youtube.com/api/stats/playback");
    expect(url).toContain("ver=2");
    expect(url).toContain("c=WEB_REMIX");
    expect(url).toContain("cpn=");
    // URL already has ?, so params should be appended with &
    expect(url).toMatch(/\?ei=abc&ver=2/);
  });

  it("accepts a pre-fetched song dict without calling getSong", async () => {
    const songDict = {
      playbackTracking: {
        videostatsPlaybackUrl: {
          baseUrl: "https://s.youtube.com/api/stats/playback",
        },
      },
    };

    const yt = {
      sendRequest: jest.fn(),
      sendGetRequest: jest.fn().mockResolvedValue({}),
      checkAuth: jest.fn(),
    } as unknown as YTMusic;

    await addHistoryItem(yt, songDict);

    // sendRequest should NOT have been called (no getSong call)
    expect(yt.sendRequest).not.toHaveBeenCalled();
    expect(yt.sendGetRequest).toHaveBeenCalledTimes(1);
    const url = (yt.sendGetRequest as jest.Mock).mock.calls[0][0] as string;
    // URL has no ?, so separator should be ?
    expect(url).toMatch(/playback\?ver=2/);
  });
});

// --- getLikedSongs ---

describe("getLikedSongs", () => {
  it("returns tracks from liked songs playlist", async () => {
    const response = makeLibraryBrowseResponse("musicShelfRenderer", [
      makeMRLIRSong("v1", "Liked 1"),
      makeMRLIRSong("v2", "Liked 2"),
    ]);
    const yt = createMockYtmusic(response);
    const result = await getLikedSongs(yt);
    expect(result["id"]).toBe("LM");
    expect(result["tracks"]).toHaveLength(2);
  });
});
