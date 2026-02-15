import type { YTMusic } from "../ytmusic.js";
import type { JsonDict, JsonList } from "../types.js";
import { nav, TAB_CONTENT } from "../navigation.js";
import { parseWatchPlaylist, getTabBrowseId } from "../parsers/watch.js";

export async function getWatchPlaylist(
  ytmusic: YTMusic,
  videoId?: string,
  playlistId?: string,
  limit = 25,
  radio = false,
  shuffle = false,
): Promise<JsonDict> {
  const body: JsonDict = {
    enablePersistentPlaylistPanel: true,
    isAudioOnly: true,
    tunerSettingValue: "AUTOMIX_SETTING_NORMAL",
  };

  if (!videoId && !playlistId) {
    throw new Error("Either videoId or playlistId must be provided");
  }

  if (videoId) {
    body["videoId"] = videoId;
    if (!playlistId) {
      playlistId = "RDAMVM" + videoId;
    }
    if (!(radio || shuffle)) {
      body["watchEndpointMusicSupportedConfigs"] = {
        watchEndpointMusicConfig: {
          hasPersistentPlaylistPanel: true,
          musicVideoType: "MUSIC_VIDEO_TYPE_ATV",
        },
      };
    }
  }

  body["playlistId"] = playlistIdTrimmed(playlistId!);
  const isPlaylist = body["playlistId"].startsWith("PL") || body["playlistId"].startsWith("OLA");

  if (shuffle) {
    body["params"] = "wAEB8gECKAE%3D";
  }
  if (radio) {
    body["params"] = "wAEB";
  }

  const response = await ytmusic.sendRequest("next", body);

  const watchNextRenderer = nav(response, [
    "contents",
    "singleColumnMusicWatchNextResultsRenderer",
    "tabbedRenderer",
    "watchNextTabbedResultsRenderer",
  ]);

  const lyricsBrowseId = getTabBrowseId(watchNextRenderer, 1);
  const relatedBrowseId = getTabBrowseId(watchNextRenderer, 2);

  const results = nav(watchNextRenderer, [
    ...TAB_CONTENT,
    "musicQueueRenderer",
    "content",
    "playlistPanelRenderer",
  ]);

  const playlist = results["contents"] as JsonList;
  const tracks = parseWatchPlaylist(playlist);

  // Handle continuations for playlist
  if (isPlaylist) {
    // For full playlists, we might have continuation data
    // For now, return what we have
  }

  const result: JsonDict = {
    tracks: tracks.slice(0, limit),
    playlistId: results["playlistId"] ?? null,
    lyrics: lyricsBrowseId,
    related: relatedBrowseId,
  };

  return result;
}

function playlistIdTrimmed(playlistId: string): string {
  return playlistId.startsWith("VL") ? playlistId.substring(2) : playlistId;
}
