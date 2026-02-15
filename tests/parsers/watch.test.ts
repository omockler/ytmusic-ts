import {
  parseWatchPlaylist,
  parseWatchTrack,
  getTabBrowseId,
} from "../../src/parsers/watch.js";

describe("parseWatchTrack", () => {
  it("parses a watch track", () => {
    const data = {
      videoId: "vid123",
      title: { runs: [{ text: "Track Title" }] },
      lengthText: { runs: [{ text: "3:45" }] },
      thumbnail: { thumbnails: [{ url: "https://img.jpg", width: 120, height: 120 }] },
      menu: {
        menuRenderer: {
          items: [
            {
              toggleMenuServiceItemRenderer: {
                defaultServiceEndpoint: {
                  likeEndpoint: { status: "INDIFFERENT" },
                },
              },
            },
          ],
        },
      },
      navigationEndpoint: {
        watchEndpoint: {
          watchEndpointMusicSupportedConfigs: {
            watchEndpointMusicConfig: {
              musicVideoType: "MUSIC_VIDEO_TYPE_ATV",
            },
          },
        },
      },
      longBylineText: {
        runs: [
          { text: "Artist", navigationEndpoint: { browseEndpoint: { browseId: "UC1" } } },
          { text: " \u2022 " },
          { text: "Album", navigationEndpoint: { browseEndpoint: { browseId: "MPREb_abc" } } },
        ],
      },
    };

    const result = parseWatchTrack(data);
    expect(result["videoId"]).toBe("vid123");
    expect(result["title"]).toBe("Track Title");
    expect(result["length"]).toBe("3:45");
    expect(result["likeStatus"]).toBe("LIKE");
    expect(result["videoType"]).toBe("MUSIC_VIDEO_TYPE_ATV");
    expect(result["artists"]).toEqual([{ name: "Artist", id: "UC1" }]);
    expect(result["album"]).toEqual({ name: "Album", id: "MPREb_abc" });
  });
});

describe("parseWatchPlaylist", () => {
  it("parses a list of watch results", () => {
    const results = [
      {
        playlistPanelVideoRenderer: {
          videoId: "vid1",
          title: { runs: [{ text: "Track 1" }] },
          thumbnail: { thumbnails: [] },
          menu: { menuRenderer: { items: [] } },
          longBylineText: { runs: [{ text: "Artist" }] },
        },
      },
      {
        playlistPanelVideoRenderer: {
          videoId: "vid2",
          title: { runs: [{ text: "Track 2" }] },
          thumbnail: { thumbnails: [] },
          menu: { menuRenderer: { items: [] } },
          longBylineText: { runs: [{ text: "Artist" }] },
        },
      },
    ];
    const tracks = parseWatchPlaylist(results);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]["videoId"]).toBe("vid1");
    expect(tracks[1]["videoId"]).toBe("vid2");
  });

  it("skips unplayable tracks", () => {
    const results = [
      {
        playlistPanelVideoRenderer: {
          videoId: "vid1",
          title: { runs: [{ text: "Track 1" }] },
          unplayableText: "Not available",
          thumbnail: { thumbnails: [] },
          menu: { menuRenderer: { items: [] } },
        },
      },
    ];
    expect(parseWatchPlaylist(results)).toHaveLength(0);
  });
});

describe("getTabBrowseId", () => {
  it("returns browseId when tab is selectable", () => {
    const renderer = {
      tabs: [
        { tabRenderer: { endpoint: { browseEndpoint: { browseId: "browse1" } } } },
        { tabRenderer: { endpoint: { browseEndpoint: { browseId: "browse2" } } } },
      ],
    };
    expect(getTabBrowseId(renderer, 0)).toBe("browse1");
    expect(getTabBrowseId(renderer, 1)).toBe("browse2");
  });

  it("returns null when tab is unselectable", () => {
    const renderer = {
      tabs: [
        { tabRenderer: { unselectable: true } },
      ],
    };
    expect(getTabBrowseId(renderer, 0)).toBeNull();
  });
});
