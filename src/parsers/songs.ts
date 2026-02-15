import {
  nav,
  NAVIGATION_BROWSE_ID,
  TEXT_RUN,
  TOGGLE_MENU,
  MENU_ITEMS,
  FEEDBACK_TOKEN,
} from "../navigation.js";
import type { JsonDict, JsonList } from "../types.js";
import { getFlexColumnItem, getItemText, parseDuration, DOT_SEPARATOR_RUN } from "./utils.js";
import { parseArtistsRuns } from "./artists.js";

export function parseSongArtists(data: JsonDict, index: number): JsonList {
  const flexItem = getFlexColumnItem(data, index);
  if (!flexItem) {
    return [];
  }
  const runs: JsonList = flexItem["text"]["runs"];
  return parseArtistsRuns(runs);
}

export function parseSongRun(run: JsonDict): JsonDict {
  const text = run["text"] as string;

  if ("navigationEndpoint" in run) {
    const item = { name: text, id: nav(run, NAVIGATION_BROWSE_ID, true) ?? null };
    if (item.id && (item.id.startsWith("MPRE") || item.id.includes("release_detail"))) {
      return { type: "album", data: item };
    } else {
      return { type: "artist", data: item };
    }
  } else {
    // note: YT uses non-breaking space \xa0 to separate number and magnitude
    if (/^\d([^ ])* [^ ]*$/.test(text)) {
      return { type: "views", data: text.split(" ")[0] };
    } else if (/^(\d+:)*\d+:\d+$/.test(text)) {
      return { type: "duration", data: text };
    } else if (/^\d{4}$/.test(text)) {
      return { type: "year", data: text };
    } else {
      return { type: "artist", data: { name: text, id: null } };
    }
  }
}

export function parseSongRuns(runs: JsonList, skipTypeSpec = false): JsonDict {
  const parsed: JsonDict = {};

  let effectiveRuns = runs;
  if (
    skipTypeSpec &&
    runs.length > 2 &&
    parseSongRun(runs[0])["type"] === "artist" &&
    runs[1]["text"] === DOT_SEPARATOR_RUN["text"] &&
    parseSongRun(runs[2])["type"] === "artist"
  ) {
    effectiveRuns = runs.slice(2);
  }

  for (let i = 0; i < effectiveRuns.length; i++) {
    if (i % 2 !== 0) continue; // odd items are separators

    const parsedRun = parseSongRun(effectiveRuns[i]);
    const data = parsedRun["data"];
    switch (parsedRun["type"]) {
      case "album":
        parsed["album"] = data;
        break;
      case "artist":
        if (!parsed["artists"]) parsed["artists"] = [];
        parsed["artists"].push(data);
        break;
      case "views":
        parsed["views"] = data;
        break;
      case "duration":
        parsed["duration"] = data;
        parsed["duration_seconds"] = parseDuration(data);
        break;
      case "year":
        parsed["year"] = data;
        break;
    }
  }

  return parsed;
}

export function parseSongAlbum(data: JsonDict, index: number): JsonDict | null {
  const flexItem = getFlexColumnItem(data, index);
  const browseId = nav(flexItem, [...TEXT_RUN, ...NAVIGATION_BROWSE_ID], true);
  return !flexItem ? null : { name: getItemText(data, index), id: browseId ?? null };
}

export function parseSongMenuData(data: JsonDict): JsonDict {
  if (!("menu" in data)) {
    return {};
  }

  const songData: JsonDict = {};
  for (const item of nav<JsonList>(data, MENU_ITEMS)) {
    const menuItem =
      nav(item, [TOGGLE_MENU], true) ?? nav(item, ["menuServiceItemRenderer"], true);
    if (menuItem == null) continue;

    songData["inLibrary"] = songData["inLibrary"] ?? false;
    songData["pinnedToListenAgain"] = songData["pinnedToListenAgain"] ?? false;

    const currentIconType =
      nav<string>(menuItem, ["defaultIcon", "iconType"], true) ??
      nav<string>(menuItem, ["icon", "iconType"], true);

    const feedbackToken = (endpointType: string): string | null =>
      nav(menuItem, [endpointType, ...FEEDBACK_TOKEN], true) ?? null;

    switch (currentIconType) {
      case "KEEP":
        songData["listenAgainFeedbackTokens"] = {
          pin: feedbackToken("defaultServiceEndpoint"),
          unpin: feedbackToken("toggledServiceEndpoint"),
        };
        break;
      case "KEEP_OFF":
        songData["pinnedToListenAgain"] = true;
        songData["listenAgainFeedbackTokens"] = {
          pin: feedbackToken("toggledServiceEndpoint"),
          unpin: feedbackToken("defaultServiceEndpoint"),
        };
        break;
      case "BOOKMARK_BORDER":
        songData["feedbackTokens"] = {
          add: feedbackToken("defaultServiceEndpoint"),
          remove: feedbackToken("toggledServiceEndpoint"),
        };
        break;
      case "BOOKMARK":
        songData["inLibrary"] = true;
        songData["feedbackTokens"] = {
          add: feedbackToken("toggledServiceEndpoint"),
          remove: feedbackToken("defaultServiceEndpoint"),
        };
        break;
      case "REMOVE_FROM_HISTORY":
        songData["feedbackToken"] = feedbackToken("serviceEndpoint");
        break;
    }
  }

  return songData;
}

export function parseLikeStatus(service: JsonDict): string {
  const status = ["LIKE", "INDIFFERENT"];
  const currentIndex = status.indexOf(service["likeEndpoint"]["status"]);
  return status[currentIndex === 0 ? 1 : 0];
}
