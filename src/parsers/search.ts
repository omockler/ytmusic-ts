import {
  nav,
  SUBTITLE,
  SUBTITLE2,
  SUBTITLE_RUNS,
  CARD_SHELF_TITLE,
  TITLE,
  TITLE_TEXT,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_VIDEO_ID,
  NAVIGATION_VIDEO_TYPE,
  NAVIGATION_PLAYLIST_ID,
  WATCH_VIDEO_ID,
  THUMBNAILS,
  BADGE_LABEL,
  PLAY_BUTTON,
  MENU_PLAYLIST_ID,
  MRLIR,
  TEXT_RUNS,
  THUMBNAIL_OVERLAY_NAVIGATION,
} from "../navigation.js";
import type { JsonDict, JsonList } from "../types.js";
import {
  getFlexColumnItem,
  getItemText,
  parseIdName,
  parseMenuPlaylists,
} from "./utils.js";
import { parseSongRuns, parseSongMenuData } from "./songs.js";
import { parseArtistsRuns } from "./artists.js";
import { parseAlbumPlaylistIdIfExists } from "./albums.js";

export const ALL_RESULT_TYPES = [
  "album",
  "artist",
  "playlist",
  "song",
  "video",
  "station",
  "profile",
  "podcast",
  "episode",
];
export const API_RESULT_TYPES = ["single", "ep", ...ALL_RESULT_TYPES];

export function getSearchResultType(
  resultTypeLocal: string,
  resultTypesLocal: string[],
): string | null {
  if (!resultTypeLocal) return null;
  const lower = resultTypeLocal.toLowerCase();
  if (!resultTypesLocal.includes(lower)) {
    return "album";
  }
  return lower;
}

export function parseTopResult(data: JsonDict, searchResultTypes: string[]): JsonDict {
  const resultType = getSearchResultType(nav(data, SUBTITLE), searchResultTypes);
  const category = nav(data, CARD_SHELF_TITLE, true) ?? "Top result";
  const searchResult: JsonDict = { category, resultType };

  if (resultType === "artist") {
    const subscribers = nav<string>(data, SUBTITLE2, true);
    if (subscribers) {
      searchResult["subscribers"] = subscribers.split(" ")[0];
    }
    const artistInfo = parseSongRuns(nav(data, ["title", "runs"]));
    Object.assign(searchResult, artistInfo);
  }

  if (resultType === "song" || resultType === "video") {
    const onTap = data["onTap"];
    if (onTap) {
      searchResult["videoId"] = nav(onTap, WATCH_VIDEO_ID);
      searchResult["videoType"] = nav(onTap, NAVIGATION_VIDEO_TYPE);
    }
  }

  if (resultType === "song" || resultType === "video" || resultType === "album") {
    searchResult["videoId"] = nav(data, ["onTap", ...WATCH_VIDEO_ID], true);
    searchResult["videoType"] = nav(data, ["onTap", ...NAVIGATION_VIDEO_TYPE], true);
    searchResult["title"] = nav(data, TITLE_TEXT);
    const runs: JsonList = nav(data, ["subtitle", "runs"]);
    const songInfo = parseSongRuns(runs.slice(2));
    Object.assign(searchResult, songInfo);
  }

  if (resultType === "album") {
    searchResult["browseId"] = nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID], true);
    const buttonCommand = nav(data, ["buttons", 0, "buttonRenderer", "command"], true);
    searchResult["playlistId"] = parseAlbumPlaylistIdIfExists(buttonCommand);
  }

  if (resultType === "playlist") {
    searchResult["playlistId"] = nav(data, MENU_PLAYLIST_ID);
    searchResult["title"] = nav(data, TITLE_TEXT);
    searchResult["author"] = parseArtistsRuns(nav<JsonList>(data, ["subtitle", "runs"]).slice(2));
  }

  if (resultType === "episode") {
    searchResult["title"] = nav(data, TITLE_TEXT);
    searchResult["videoId"] = nav(data, [...THUMBNAIL_OVERLAY_NAVIGATION, ...WATCH_VIDEO_ID]);
    searchResult["videoType"] = nav(data, [...THUMBNAIL_OVERLAY_NAVIGATION, ...NAVIGATION_VIDEO_TYPE]);
    const runs = nav<JsonList>(data, SUBTITLE_RUNS).slice(2);
    searchResult["date"] = runs[0]["text"];
    searchResult["podcast"] = parseIdName(runs[2]);
  }

  searchResult["thumbnails"] = nav(data, THUMBNAILS, true);
  return searchResult;
}

export function parseSearchResult(
  data: JsonDict,
  resultType: string | null,
  category: string | null,
): JsonDict {
  const defaultOffset = (!resultType || resultType === "album") ? 2 : 0;
  const searchResult: JsonDict = { category };
  const videoType = nav<string>(
    data,
    [...PLAY_BUTTON, "playNavigationEndpoint", ...NAVIGATION_VIDEO_TYPE],
    true,
  );

  if (!resultType) {
    const browseId = nav<string>(data, NAVIGATION_BROWSE_ID, true);
    if (browseId) {
      const mapping: Record<string, string> = {
        VM: "playlist",
        RD: "playlist",
        VL: "playlist",
        MPLA: "artist",
        MPRE: "album",
        MPSP: "podcast",
        MPED: "episode",
        UC: "artist",
      };
      resultType = null;
      for (const [prefix, type] of Object.entries(mapping)) {
        if (browseId.startsWith(prefix)) {
          resultType = type;
          break;
        }
      }
    } else {
      const vtMap: Record<string, string> = {
        MUSIC_VIDEO_TYPE_ATV: "song",
        MUSIC_VIDEO_TYPE_PODCAST_EPISODE: "episode",
      };
      resultType = vtMap[videoType ?? ""] ?? "video";
    }
  }

  searchResult["resultType"] = resultType;

  if (resultType !== "artist") {
    searchResult["title"] = getItemText(data, 0);
  }

  if (resultType === "artist") {
    searchResult["artist"] = getItemText(data, 0);
    parseMenuPlaylists(data, searchResult);
  } else if (resultType === "album") {
    searchResult["type"] = getItemText(data, 1);
    const playNavigation = nav(data, [...PLAY_BUTTON, "playNavigationEndpoint"], true);
    searchResult["playlistId"] = parseAlbumPlaylistIdIfExists(playNavigation);
  } else if (resultType === "playlist") {
    const flexItem = nav(getFlexColumnItem(data, 1), TEXT_RUNS);
    const hasAuthor = flexItem.length === defaultOffset + 3;
    searchResult["itemCount"] = (
      getItemText(data, 1, defaultOffset + (hasAuthor ? 2 : 0)) ?? ""
    ).split(" ")[0];
    if (searchResult["itemCount"] && /^\d+$/.test(searchResult["itemCount"])) {
      searchResult["itemCount"] = parseInt(searchResult["itemCount"], 10);
    }
    searchResult["author"] = !hasAuthor ? null : getItemText(data, 1, defaultOffset);
  } else if (resultType === "station") {
    searchResult["videoId"] = nav(data, NAVIGATION_VIDEO_ID);
    searchResult["playlistId"] = nav(data, NAVIGATION_PLAYLIST_ID);
  } else if (resultType === "profile") {
    searchResult["name"] = getItemText(data, 1, 2, true);
  } else if (resultType === "song") {
    searchResult["album"] = null;
    Object.assign(searchResult, parseSongMenuData(data));
  }

  if (resultType === "song" || resultType === "video" || resultType === "episode") {
    searchResult["videoId"] = nav(
      data,
      [...PLAY_BUTTON, "playNavigationEndpoint", "watchEndpoint", "videoId"],
      true,
    );
    searchResult["videoType"] = videoType;
  }

  if (resultType === "song" || resultType === "video" || resultType === "album") {
    searchResult["duration"] = null;
    searchResult["year"] = null;
    const flexItem = getFlexColumnItem(data, 1);
    if (!flexItem) {
      throw new Error("Expected flex column item at index 1");
    }
    const runs = flexItem["text"]["runs"] as JsonList;
    const flexItem2 = getFlexColumnItem(data, 2);
    if (flexItem2) {
      runs.push({ text: "" }, ...flexItem2["text"]["runs"]);
    }
    const songInfo = parseSongRuns(runs, true);
    Object.assign(searchResult, songInfo);
  }

  if (
    resultType === "artist" ||
    resultType === "album" ||
    resultType === "playlist" ||
    resultType === "profile" ||
    resultType === "podcast"
  ) {
    searchResult["browseId"] = nav(data, NAVIGATION_BROWSE_ID, true);
  }

  if (resultType === "song" || resultType === "album") {
    searchResult["isExplicit"] = nav(data, BADGE_LABEL, true) != null;
  }

  if (resultType === "episode") {
    const flexItem = getFlexColumnItem(data, 1);
    const runs = nav<JsonList>(flexItem, TEXT_RUNS).slice(defaultOffset);
    const hasDate = runs.length > 1 ? 1 : 0;
    searchResult["live"] = !!nav(data, ["badges", 0, "liveBadgeRenderer"], true);
    if (hasDate) {
      searchResult["date"] = runs[0]["text"];
    }
    searchResult["podcast"] = parseIdName(runs[hasDate * 2]);
  }

  searchResult["thumbnails"] = nav(data, THUMBNAILS, true);
  return searchResult;
}

export function parseSearchResults(
  results: JsonList,
  resultType: string | null = null,
  category: string | null = null,
): JsonList {
  return results.map((result) => parseSearchResult(result[MRLIR], resultType, category));
}

export function getSearchParams(
  filter: string | null | undefined,
  scope: string | null | undefined,
  ignoreSpelling: boolean,
): string | null {
  const filteredParam1 = "EgWKAQ";
  let params: string | null = null;
  let param1: string | undefined;
  let param2: string | undefined;
  let param3: string | undefined;

  if (filter == null && scope == null && !ignoreSpelling) {
    return params;
  }

  if (scope === "uploads") {
    params = "agIYAw%3D%3D";
  }

  if (scope === "library") {
    if (filter) {
      param1 = filteredParam1;
      param2 = getParam2(filter);
      param3 = "AWoKEAUQCRADEAoYBA%3D%3D";
    } else {
      params = "agIYBA%3D%3D";
    }
  }

  if (scope == null && filter) {
    if (filter === "playlists") {
      params = "Eg-KAQwIABAAGAAgACgB";
      if (!ignoreSpelling) {
        params += "MABqChAEEAMQCRAFEAo%3D";
      } else {
        params += "MABCAggBagoQBBADEAkQBRAK";
      }
    } else if (filter.includes("playlists")) {
      param1 = "EgeKAQQoA";
      if (filter === "featured_playlists") {
        param2 = "Dg";
      } else {
        param2 = "EA";
      }
      if (!ignoreSpelling) {
        param3 = "BagwQDhAKEAMQBBAJEAU%3D";
      } else {
        param3 = "BQgIIAWoMEA4QChADEAQQCRAF";
      }
    } else {
      param1 = filteredParam1;
      param2 = getParam2(filter);
      if (!ignoreSpelling) {
        param3 = "AWoMEA4QChADEAQQCRAF";
      } else {
        param3 = "AUICCAFqDBAOEAoQAxAEEAkQBQ%3D%3D";
      }
    }
  }

  if (!scope && !filter && ignoreSpelling) {
    params = "EhGKAQ4IARABGAEgASgAOAFAAUICCAE%3D";
  }

  if (params != null) return params;
  if (param1 == null || param2 == null || param3 == null) {
    throw new Error(`Unexpected search param state for filter=${filter}, scope=${scope}`);
  }
  return param1 + param2 + param3;
}

function getParam2(filter: string): string {
  const filterParams: Record<string, string> = {
    songs: "II",
    videos: "IQ",
    albums: "IY",
    artists: "Ig",
    playlists: "Io",
    profiles: "JY",
    podcasts: "JQ",
    episodes: "JI",
  };
  return filterParams[filter];
}

export function parseSearchSuggestions(
  results: JsonDict,
  detailedRuns: boolean,
): string[] | JsonList {
  if (
    !results["contents"]?.[0]?.["searchSuggestionsSectionRenderer"]?.["contents"]?.length
  ) {
    return [];
  }

  const rawSuggestions: JsonList =
    results["contents"][0]["searchSuggestionsSectionRenderer"]["contents"];
  const suggestions: (string | JsonDict)[] = [];

  for (const rawSuggestion of rawSuggestions) {
    let feedbackToken: string | null = null;
    let suggestionContent: JsonDict;
    if ("historySuggestionRenderer" in rawSuggestion) {
      suggestionContent = rawSuggestion["historySuggestionRenderer"];
      feedbackToken =
        nav(
          suggestionContent,
          ["serviceEndpoint", "feedbackEndpoint", "feedbackToken"],
          true,
        ) ?? null;
    } else {
      suggestionContent = rawSuggestion["searchSuggestionRenderer"];
    }

    const text = suggestionContent["navigationEndpoint"]["searchEndpoint"]["query"] as string;
    const runs = suggestionContent["suggestion"]["runs"];

    if (detailedRuns) {
      suggestions.push({
        text,
        runs,
        fromHistory: feedbackToken != null,
        feedbackToken,
      });
    } else {
      suggestions.push(text);
    }
  }

  return suggestions as string[] | JsonList;
}
