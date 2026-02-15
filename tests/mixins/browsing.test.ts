import { jest } from "@jest/globals";
import {
  getSong,
  getLyrics,
  getAlbum,
  getUserPlaylists,
} from "../../src/mixins/browsing.js";
import type { YTMusic } from "../../src/ytmusic.js";
import type { JsonDict } from "../../src/types.js";

function createMockYtmusic(response: JsonDict): YTMusic {
  return {
    sendRequest: jest.fn().mockResolvedValue(response),
  } as unknown as YTMusic;
}

describe("getSong", () => {
  it("returns filtered response keys", async () => {
    const yt = createMockYtmusic({
      videoDetails: { videoId: "abc" },
      playabilityStatus: { status: "OK" },
      streamingData: {},
      microformat: {},
      playbackTracking: {},
      responseContext: {},
      otherJunk: {},
    });
    const result = await getSong(yt, "abc");
    expect(result["videoDetails"]).toBeDefined();
    expect(result["playabilityStatus"]).toBeDefined();
    expect(result["responseContext"]).toBeUndefined();
    expect(result["otherJunk"]).toBeUndefined();
  });
});

describe("getLyrics", () => {
  it("returns lyrics from description shelf", async () => {
    const yt = createMockYtmusic({
      contents: {
        sectionListRenderer: {
          contents: [
            {
              musicDescriptionShelfRenderer: {
                description: { runs: [{ text: "Lyrics text here" }] },
                footer: { runs: [{ text: "Source: LyricFind" }] },
              },
            },
          ],
        },
      },
    });
    const result = await getLyrics(yt, "MPLYt_abc");
    expect(result).not.toBeNull();
    expect(result!["lyrics"]).toBe("Lyrics text here");
    expect(result!["hasTimestamps"]).toBe(false);
  });

  it("returns null when no lyrics found", async () => {
    const yt = createMockYtmusic({
      contents: {
        sectionListRenderer: { contents: [{}] },
      },
    });
    const result = await getLyrics(yt, "MPLYt_abc");
    expect(result).toBeNull();
  });

  it("throws when browseId is empty", async () => {
    const yt = createMockYtmusic({});
    await expect(getLyrics(yt, "")).rejects.toThrow("Invalid browseId");
  });
});

describe("getAlbum", () => {
  it("throws on invalid browseId", async () => {
    const yt = createMockYtmusic({});
    await expect(getAlbum(yt, "invalid")).rejects.toThrow("Invalid album browseId");
    await expect(getAlbum(yt, "")).rejects.toThrow("Invalid album browseId");
  });
});

describe("getUserPlaylists", () => {
  it("returns empty array when no results", async () => {
    const yt = createMockYtmusic({
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
    });
    const result = await getUserPlaylists(yt, "UC123", "params123");
    expect(result).toEqual([]);
  });
});
