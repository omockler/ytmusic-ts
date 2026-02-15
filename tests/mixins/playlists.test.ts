import { jest } from "@jest/globals";
import {
  getPlaylist,
  createPlaylist,
  editPlaylist,
  deletePlaylist,
  addPlaylistItems,
  removePlaylistItems,
} from "../../src/mixins/playlists.js";
import type { YTMusic } from "../../src/ytmusic.js";
import type { JsonDict } from "../../src/types.js";

function createMockYtmusic(response: JsonDict | ((...args: any[]) => JsonDict)): YTMusic {
  const sendRequest = typeof response === "function"
    ? jest.fn(response as any)
    : jest.fn().mockResolvedValue(response);
  return {
    sendRequest,
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

function makePlaylistBrowseResponse(tracks: any[], owned = false) {
  const headerContent: JsonDict = {
    musicResponsiveHeaderRenderer: {
      title: { runs: [{ text: "Test Playlist" }] },
      thumbnail: {
        musicThumbnailRenderer: {
          thumbnail: { thumbnails: [{ url: "https://thumb.jpg", width: 226, height: 226 }] },
        },
      },
      subtitle: {
        runs: [
          { text: "Playlist" },
          { text: " \u2022 " },
          { text: "2020" },
        ],
      },
      secondSubtitle: {
        runs: [
          { text: `${tracks.length} songs` },
          { text: " \u2022 " },
          { text: "10 minutes" },
        ],
      },
      description: {
        musicDescriptionShelfRenderer: {
          description: { runs: [{ text: "A test description" }] },
        },
      },
      buttons: [
        {},
        {
          musicPlayButtonRenderer: {
            playNavigationEndpoint: {
              watchEndpoint: { playlistId: "PLtest123" },
            },
          },
        },
      ],
      facepile: {
        avatarStackViewModel: {
          text: { content: "TestAuthor" },
          rendererContext: {
            commandContext: {
              onTap: {
                innertubeCommand: {
                  browseEndpoint: { browseId: "UCauthor" },
                },
              },
            },
            accessibilityContext: { label: "TestAuthor" },
          },
        },
      },
    },
  };

  const sectionListItem = owned
    ? {
        musicEditablePlaylistDetailHeaderRenderer: {
          playlistId: "PLtest123",
          header: headerContent,
          editHeader: {
            musicPlaylistEditHeaderRenderer: { privacy: "PRIVATE" },
          },
        },
      }
    : headerContent;

  return {
    contents: {
      twoColumnBrowseResultsRenderer: {
        tabs: [
          {
            tabRenderer: {
              content: {
                sectionListRenderer: {
                  contents: [sectionListItem],
                },
              },
            },
          },
        ],
        secondaryContents: {
          sectionListRenderer: {
            contents: [
              {
                musicPlaylistShelfRenderer: {
                  contents: tracks,
                },
              },
            ],
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
    ["createPlaylist", () => createPlaylist(unauthYt, "title", "desc")],
    ["editPlaylist", () => editPlaylist(unauthYt, "PL123")],
    ["deletePlaylist", () => deletePlaylist(unauthYt, "PL123")],
    ["addPlaylistItems", () => addPlaylistItems(unauthYt, "PL123", ["vid"])],
    ["removePlaylistItems", () => removePlaylistItems(unauthYt, "PL123", [{ videoId: "v", setVideoId: "s" }])],
  ] as const;

  it.each(authFunctions)("%s requires authentication", async (_name, fn) => {
    await expect(fn()).rejects.toThrow("authentication");
  });
});

// --- getPlaylist ---

describe("getPlaylist", () => {
  it("returns parsed playlist with tracks", async () => {
    const tracks = [makeMRLIRSong("v1", "Song 1"), makeMRLIRSong("v2", "Song 2")];
    const response = makePlaylistBrowseResponse(tracks);
    const yt = createMockYtmusic(response);
    const result = await getPlaylist(yt, "PLtest123");
    expect(result["tracks"]).toHaveLength(2);
    expect(result["tracks"][0]["videoId"]).toBe("v1");
    expect(result["tracks"][1]["videoId"]).toBe("v2");
    expect(result["title"]).toBe("Test Playlist");
    expect(result["description"]).toBe("A test description");
    expect(result["owned"]).toBe(false);
    expect(result["privacy"]).toBe("PUBLIC");
  });

  it("prepends VL to playlist id", async () => {
    const response = makePlaylistBrowseResponse([]);
    const yt = createMockYtmusic(response);
    await getPlaylist(yt, "PLtest123");
    expect(yt.sendRequest).toHaveBeenCalledWith(
      "browse",
      { browseId: "VLPLtest123" },
      "",
    );
  });

  it("does not double-prepend VL", async () => {
    const response = makePlaylistBrowseResponse([]);
    const yt = createMockYtmusic(response);
    await getPlaylist(yt, "VLPLtest123");
    expect(yt.sendRequest).toHaveBeenCalledWith(
      "browse",
      { browseId: "VLPLtest123" },
      "",
    );
  });

  it("parses owned playlist", async () => {
    const tracks = [makeMRLIRSong("v1", "Song 1")];
    const response = makePlaylistBrowseResponse(tracks, true);
    const yt = createMockYtmusic(response);
    const result = await getPlaylist(yt, "PLtest123");
    expect(result["owned"]).toBe(true);
    expect(result["privacy"]).toBe("PRIVATE");
    expect(result["id"]).toBe("PLtest123");
  });

  it("computes duration_seconds", async () => {
    const tracks = [makeMRLIRSong("v1", "Song 1"), makeMRLIRSong("v2", "Song 2")];
    const response = makePlaylistBrowseResponse(tracks);
    const yt = createMockYtmusic(response);
    const result = await getPlaylist(yt, "PLtest123");
    // Each song has "3:00" = 180 seconds
    expect(result["duration_seconds"]).toBe(360);
  });
});

// --- createPlaylist ---

describe("createPlaylist", () => {
  it("returns playlist id on success", async () => {
    const yt = createMockYtmusic({ playlistId: "PLnew123" });
    const result = await createPlaylist(yt, "My Playlist", "A description");
    expect(result).toBe("PLnew123");
    expect(yt.sendRequest).toHaveBeenCalledWith("playlist/create", {
      title: "My Playlist",
      description: "A description",
      privacyStatus: "PRIVATE",
    });
  });

  it("strips HTML from description", async () => {
    const yt = createMockYtmusic({ playlistId: "PLnew" });
    await createPlaylist(yt, "Test", "<b>Bold</b> text");
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    expect((call[1] as JsonDict)["description"]).toBe("Bold text");
  });

  it("includes videoIds when provided", async () => {
    const yt = createMockYtmusic({ playlistId: "PLnew" });
    await createPlaylist(yt, "Test", "desc", "PUBLIC", ["v1", "v2"]);
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    expect((call[1] as JsonDict)["videoIds"]).toEqual(["v1", "v2"]);
    expect((call[1] as JsonDict)["privacyStatus"]).toBe("PUBLIC");
  });

  it("includes sourcePlaylistId when provided", async () => {
    const yt = createMockYtmusic({ playlistId: "PLnew" });
    await createPlaylist(yt, "Test", "desc", "PRIVATE", undefined, "PLsource");
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    expect((call[1] as JsonDict)["sourcePlaylistId"]).toBe("PLsource");
  });

  it("returns full response on error", async () => {
    const yt = createMockYtmusic({ error: "something went wrong" });
    const result = await createPlaylist(yt, "Test", "desc");
    expect(result).toEqual({ error: "something went wrong" });
  });

  it("throws on invalid characters in title", async () => {
    const yt = createMockYtmusic({});
    await expect(createPlaylist(yt, "Bad<Title>", "desc")).rejects.toThrow("invalid characters");
  });
});

// --- editPlaylist ---

describe("editPlaylist", () => {
  it("sends title action", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED" });
    const result = await editPlaylist(yt, "PLtest", "New Title");
    expect(result).toBe("STATUS_SUCCEEDED");
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    const body = call[1] as JsonDict;
    expect(body["playlistId"]).toBe("PLtest");
    expect(body["actions"]).toContainEqual({
      action: "ACTION_SET_PLAYLIST_NAME",
      playlistName: "New Title",
    });
  });

  it("strips VL from playlist id", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED" });
    await editPlaylist(yt, "VLPLtest", "Title");
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    expect((call[1] as JsonDict)["playlistId"]).toBe("PLtest");
  });

  it("sends moveItem with tuple", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED" });
    await editPlaylist(yt, "PLtest", undefined, undefined, undefined, ["setA", "setB"]);
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    const actions = (call[1] as JsonDict)["actions"] as JsonDict[];
    expect(actions).toContainEqual({
      action: "ACTION_MOVE_VIDEO_BEFORE",
      setVideoId: "setA",
      movedSetVideoIdSuccessor: "setB",
    });
  });

  it("sends addToTop as single action (not duplicated)", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED" });
    await editPlaylist(yt, "PLtest", undefined, undefined, undefined, undefined, undefined, true);
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    const actions = (call[1] as JsonDict)["actions"] as JsonDict[];
    const addToTopActions = actions.filter((a) => a["action"] === "ACTION_SET_ADD_TO_TOP");
    expect(addToTopActions).toHaveLength(1);
    expect(addToTopActions[0]["addToTop"]).toBe("true");
  });

  it("sends empty string description (not skipped by truthiness)", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED" });
    await editPlaylist(yt, "PLtest", undefined, "");
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    const actions = (call[1] as JsonDict)["actions"] as JsonDict[];
    expect(actions).toContainEqual({
      action: "ACTION_SET_PLAYLIST_DESCRIPTION",
      playlistDescription: "",
    });
  });

  it("sends addToTop false", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED" });
    await editPlaylist(yt, "PLtest", undefined, undefined, undefined, undefined, undefined, false);
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    const actions = (call[1] as JsonDict)["actions"] as JsonDict[];
    const addToTopActions = actions.filter((a) => a["action"] === "ACTION_SET_ADD_TO_TOP");
    expect(addToTopActions).toHaveLength(1);
    expect(addToTopActions[0]["addToTop"]).toBe("false");
  });
});

// --- deletePlaylist ---

describe("deletePlaylist", () => {
  it("returns status on success", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED" });
    const result = await deletePlaylist(yt, "PLtest");
    expect(result).toBe("STATUS_SUCCEEDED");
    expect(yt.sendRequest).toHaveBeenCalledWith("playlist/delete", {
      playlistId: "PLtest",
    });
  });

  it("returns full response on error", async () => {
    const yt = createMockYtmusic({ error: "not found" });
    const result = await deletePlaylist(yt, "PLtest");
    expect(result).toEqual({ error: "not found" });
  });
});

// --- addPlaylistItems ---

describe("addPlaylistItems", () => {
  it("adds video ids", async () => {
    const yt = createMockYtmusic({
      status: "STATUS_SUCCEEDED",
      playlistEditResults: [
        { playlistEditVideoAddedResultData: { videoId: "v1", setVideoId: "set1" } },
      ],
    });
    const result = await addPlaylistItems(yt, "PLtest", ["v1"]);
    expect(result["status"]).toBe("STATUS_SUCCEEDED");
    expect(result["playlistEditResults"]).toHaveLength(1);
    expect(result["playlistEditResults"][0]["videoId"]).toBe("v1");
  });

  it("sets dedupeOption when duplicates is true", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED", playlistEditResults: [] });
    await addPlaylistItems(yt, "PLtest", ["v1"], undefined, true);
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    const actions = (call[1] as JsonDict)["actions"] as JsonDict[];
    expect(actions[0]["dedupeOption"]).toBe("DEDUPE_OPTION_SKIP");
  });

  it("throws when no videoIds or sourcePlaylist", async () => {
    const yt = createMockYtmusic({});
    await expect(addPlaylistItems(yt, "PLtest")).rejects.toThrow("must provide");
  });

  it("adds source playlist with empty video action", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED", playlistEditResults: [] });
    await addPlaylistItems(yt, "PLtest", undefined, "PLsource");
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    const actions = (call[1] as JsonDict)["actions"] as JsonDict[];
    expect(actions).toHaveLength(2);
    expect(actions[0]["action"]).toBe("ACTION_ADD_PLAYLIST");
    expect(actions[1]["action"]).toBe("ACTION_ADD_VIDEO");
    expect(actions[1]["addedVideoId"]).toBeNull();
  });
});

// --- removePlaylistItems ---

describe("removePlaylistItems", () => {
  it("removes videos with correct actions", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED" });
    const videos = [
      { videoId: "v1", setVideoId: "set1" },
      { videoId: "v2", setVideoId: "set2" },
    ];
    const result = await removePlaylistItems(yt, "PLtest", videos);
    expect(result).toBe("STATUS_SUCCEEDED");
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    const actions = (call[1] as JsonDict)["actions"] as JsonDict[];
    expect(actions).toHaveLength(2);
    expect(actions[0]).toEqual({
      setVideoId: "set1",
      removedVideoId: "v1",
      action: "ACTION_REMOVE_VIDEO",
    });
  });

  it("throws when no valid videos", async () => {
    const yt = createMockYtmusic({});
    await expect(
      removePlaylistItems(yt, "PLtest", [{ title: "no ids" }]),
    ).rejects.toThrow("setVideoId is missing");
  });

  it("filters out videos without setVideoId", async () => {
    const yt = createMockYtmusic({ status: "STATUS_SUCCEEDED" });
    const videos = [
      { videoId: "v1" }, // missing setVideoId
      { videoId: "v2", setVideoId: "set2" },
    ];
    const result = await removePlaylistItems(yt, "PLtest", videos);
    expect(result).toBe("STATUS_SUCCEEDED");
    const call = (yt.sendRequest as jest.Mock).mock.calls[0];
    const actions = (call[1] as JsonDict)["actions"] as JsonDict[];
    expect(actions).toHaveLength(1);
    expect(actions[0]["removedVideoId"]).toBe("v2");
  });
});

// --- CRUD lifecycle ---

describe("playlist CRUD lifecycle", () => {
  it("create, edit, delete", async () => {
    const yt = {
      sendRequest: jest.fn<any>()
        .mockResolvedValueOnce({ playlistId: "PLnew" })   // create
        .mockResolvedValueOnce({ status: "STATUS_SUCCEEDED" }) // edit
        .mockResolvedValueOnce({ status: "STATUS_SUCCEEDED" }), // delete
      sendGetRequest: jest.fn(),
      checkAuth: jest.fn(),
    } as unknown as YTMusic;

    const id = await createPlaylist(yt, "Test", "desc");
    expect(id).toBe("PLnew");

    const editResult = await editPlaylist(yt, id as string, "Renamed");
    expect(editResult).toBe("STATUS_SUCCEEDED");

    const deleteResult = await deletePlaylist(yt, id as string);
    expect(deleteResult).toBe("STATUS_SUCCEEDED");
  });
});
