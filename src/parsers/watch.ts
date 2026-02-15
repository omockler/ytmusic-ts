import {
  nav,
  TITLE_TEXT,
  THUMBNAIL,
  MENU_ITEMS,
  TOGGLE_MENU,
  NAVIGATION_VIDEO_TYPE,
} from "../navigation.js";
import type { JsonDict, JsonList } from "../types.js";
import { parseSongRuns, parseSongMenuData, parseLikeStatus } from "./songs.js";

const PPVWR = "playlistPanelVideoWrapperRenderer";
const PPVR = "playlistPanelVideoRenderer";

export function parseWatchPlaylist(results: JsonList): JsonList {
  const tracks: JsonList = [];
  for (let result of results) {
    let counterpart: JsonDict | undefined;
    if (PPVWR in result) {
      counterpart = result[PPVWR]["counterpart"][0]["counterpartRenderer"][PPVR];
      result = result[PPVWR]["primaryRenderer"];
    }
    if (!(PPVR in result)) continue;
    const data = result[PPVR];
    if ("unplayableText" in data) continue;

    const track = parseWatchTrack(data);
    if (counterpart) {
      track["counterpart"] = parseWatchTrack(counterpart);
    }
    tracks.push(track);
  }
  return tracks;
}

export function parseWatchTrack(data: JsonDict): JsonDict {
  let likeStatus: string | null = null;
  for (const item of nav<JsonList>(data, MENU_ITEMS)) {
    if (TOGGLE_MENU in item) {
      const service = item[TOGGLE_MENU]["defaultServiceEndpoint"];
      if ("likeEndpoint" in service) {
        likeStatus = parseLikeStatus(service);
      }
    }
  }

  const track: JsonDict = {
    videoId: data["videoId"],
    title: nav(data, TITLE_TEXT),
    length: nav(data, ["lengthText", "runs", 0, "text"], true) ?? null,
    thumbnail: nav(data, THUMBNAIL),
    likeStatus,
    videoType: nav(data, ["navigationEndpoint", ...NAVIGATION_VIDEO_TYPE], true) ?? null,
  };

  Object.assign(track, {
    inLibrary: null,
    feedbackTokens: null,
    pinnedToListenAgain: null,
    listenAgainFeedbackTokens: null,
    ...parseSongMenuData(data),
  });

  const longBylineText = nav(data, ["longBylineText"], true);
  if (longBylineText) {
    const songInfo = parseSongRuns(longBylineText["runs"]);
    Object.assign(track, songInfo);
  }

  return track;
}

export function getTabBrowseId(watchNextRenderer: JsonDict, tabId: number): string | null {
  if (!("unselectable" in watchNextRenderer["tabs"][tabId]["tabRenderer"])) {
    return watchNextRenderer["tabs"][tabId]["tabRenderer"]["endpoint"]["browseEndpoint"][
      "browseId"
    ] as string;
  }
  return null;
}
