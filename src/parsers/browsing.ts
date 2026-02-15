import {
  nav,
  DESCRIPTION_SHELF,
  DESCRIPTION,
  RUN_TEXT,
  CAROUSEL_TITLE,
  MTRIR,
  MRLIR,
  TITLE,
  TITLE_TEXT,
  NAVIGATION_BROWSE,
  PAGE_TYPE,
  NAVIGATION_VIDEO_ID,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_WATCH_PLAYLIST_ID,
  NAVIGATION_VIDEO_TYPE,
  NAVIGATION_BROWSE_ID,
  SUBTITLE,
  SUBTITLE2,
  SUBTITLE_RUNS,
  SUBTITLE_BADGE_LABEL,
  THUMBNAIL_RENDERER,
  THUMBNAIL_OVERLAY_NAVIGATION,
  THUMBNAILS,
  BADGE_LABEL,
  PLAY_BUTTON,
  WATCH_PLAYLIST_ID,
  MENU_ITEMS,
  MENU_SERVICE,
  QUEUE_VIDEO_ID,
  TEXT_RUN,
  TEXT_RUNS,
  TEXT_RUN_TEXT,
} from "../navigation.js";
import type { JsonDict, JsonList, ParseFuncDict } from "../types.js";
import { getDotSeparatorIndex, getFlexColumnItem, parseIdName } from "./utils.js";
import { parseSongRuns } from "./songs.js";
import { parseArtistsRuns } from "./artists.js";
import { parseAlbumPlaylistIdIfExists } from "./albums.js";

export function parseMixedContent(rows: JsonList): JsonList {
  const items: JsonList = [];
  for (const row of rows) {
    if (DESCRIPTION_SHELF[0] in row) {
      const results = nav(row, DESCRIPTION_SHELF);
      const title = nav(results, ["header", ...RUN_TEXT]);
      const contents = nav(results, DESCRIPTION);
      items.push({ title, contents });
    } else {
      const results = Object.values(row)[0] as JsonDict;
      if (!("contents" in results)) continue;
      const title = nav(results, [...CAROUSEL_TITLE, "text"]);
      const contents: JsonList = [];
      for (const result of results["contents"]) {
        let data = nav(result, [MTRIR], true);
        let content: JsonDict | null = null;
        if (data) {
          const pageType = nav(data, [...TITLE, ...NAVIGATION_BROWSE, ...PAGE_TYPE], true);
          if (pageType == null) {
            if (nav(data, NAVIGATION_WATCH_PLAYLIST_ID, true) != null) {
              content = parseWatchPlaylist(data);
            } else {
              content = parseSong(data);
            }
          } else if (pageType === "MUSIC_PAGE_TYPE_ALBUM" || pageType === "MUSIC_PAGE_TYPE_AUDIOBOOK") {
            content = parseAlbum(data);
          } else if (pageType === "MUSIC_PAGE_TYPE_ARTIST" || pageType === "MUSIC_PAGE_TYPE_USER_CHANNEL") {
            content = parseRelatedArtist(data);
          } else if (pageType === "MUSIC_PAGE_TYPE_PLAYLIST") {
            content = parsePlaylist(data);
          }
        } else {
          data = nav(result, [MRLIR], true);
          if (data) {
            content = parseSongFlat(data);
          } else {
            continue;
          }
        }
        if (content) {
          contents.push(content);
        }
      }
      items.push({ title, contents });
    }
  }
  return items;
}

export function parseContentList(
  results: JsonList,
  parseFunc: ParseFuncDict,
  key: string = MTRIR,
): JsonList {
  const contents: JsonList = [];
  for (const result of results) {
    contents.push(parseFunc(result[key]));
  }
  return contents;
}

export function parseAlbum(result: JsonDict): JsonDict {
  const album: JsonDict = {
    title: nav(result, TITLE_TEXT),
    type: nav(result, SUBTITLE),
    artists: (nav<JsonList>(result, ["subtitle", "runs"]) ?? [])
      .filter((x: JsonDict) => "navigationEndpoint" in x)
      .map((x: JsonDict) => parseIdName(x)),
    browseId: nav(result, [...TITLE, ...NAVIGATION_BROWSE_ID]),
    audioPlaylistId: parseAlbumPlaylistIdIfExists(nav(result, THUMBNAIL_OVERLAY_NAVIGATION, true)),
    thumbnails: nav(result, THUMBNAIL_RENDERER),
    isExplicit: nav(result, SUBTITLE_BADGE_LABEL, true) != null,
  };

  const year = nav<string>(result, SUBTITLE2, true);
  if (year && /^\d+$/.test(year)) {
    album["year"] = year;
  }

  return album;
}

export function parseSingle(result: JsonDict): JsonDict {
  return {
    title: nav(result, TITLE_TEXT),
    year: nav(result, SUBTITLE, true),
    browseId: nav(result, [...TITLE, ...NAVIGATION_BROWSE_ID]),
    thumbnails: nav(result, THUMBNAIL_RENDERER),
  };
}

export function parseSong(result: JsonDict): JsonDict {
  const song: JsonDict = {
    title: nav(result, TITLE_TEXT),
    videoId: nav(result, NAVIGATION_VIDEO_ID),
    playlistId: nav(result, NAVIGATION_PLAYLIST_ID, true),
    thumbnails: nav(result, THUMBNAIL_RENDERER),
  };
  Object.assign(song, parseSongRuns(nav(result, SUBTITLE_RUNS), true));
  return song;
}

export function parseSongFlat(data: JsonDict, withPlaylistId = false): JsonDict {
  const columns: (JsonDict | null)[] = [];
  for (let i = 0; i < data["flexColumns"].length; i++) {
    columns.push(getFlexColumnItem(data, i));
  }
  const song: JsonDict = {
    title: nav(columns[0], TEXT_RUN_TEXT),
    videoId: nav(columns[0], [...TEXT_RUN, ...NAVIGATION_VIDEO_ID], true),
    videoType: nav(
      data,
      [...PLAY_BUTTON, "playNavigationEndpoint", ...NAVIGATION_VIDEO_TYPE],
      true,
    ),
    thumbnails: nav(data, THUMBNAILS),
    isExplicit: nav(data, BADGE_LABEL, true) != null,
  };

  if (withPlaylistId) {
    song["playlistId"] = nav(data, [...PLAY_BUTTON, "playNavigationEndpoint", ...WATCH_PLAYLIST_ID]);
  }

  const runs: JsonList = nav(columns[1], TEXT_RUNS);
  Object.assign(song, parseSongRuns(runs, true));

  if (
    columns.length > 2 &&
    columns[2] != null &&
    "navigationEndpoint" in nav(columns[2], TEXT_RUN)
  ) {
    song["album"] = {
      name: nav(columns[2], TEXT_RUN_TEXT),
      id: nav(columns[2], [...TEXT_RUN, ...NAVIGATION_BROWSE_ID]),
    };
  }

  return song;
}

export function parseVideo(result: JsonDict): JsonDict {
  const runs: JsonList = nav(result, SUBTITLE_RUNS);
  const artistsLen = getDotSeparatorIndex(runs);
  let videoId = nav<string>(result, NAVIGATION_VIDEO_ID, true);
  if (!videoId) {
    const menuItems = nav<JsonList>(result, MENU_ITEMS);
    for (const entry of menuItems) {
      const vid = nav<string>(entry, [...MENU_SERVICE, ...QUEUE_VIDEO_ID], true);
      if (vid) {
        videoId = vid;
        break;
      }
    }
  }
  return {
    title: nav(result, TITLE_TEXT),
    videoId,
    artists: parseArtistsRuns(runs.slice(0, artistsLen)),
    playlistId: nav(result, NAVIGATION_PLAYLIST_ID, true),
    thumbnails: nav(result, THUMBNAIL_RENDERER, true),
    views: runs.length > 0 ? (runs[runs.length - 1]["text"] as string).split(" ")[0] : null,
  };
}

export function parsePlaylist(data: JsonDict): JsonDict {
  const playlist: JsonDict = {
    title: nav(data, TITLE_TEXT, true),
    playlistId: (nav<string>(data, [...TITLE, ...NAVIGATION_BROWSE_ID])).substring(2),
    thumbnails: nav(data, THUMBNAIL_RENDERER),
  };
  const subtitle = data["subtitle"];
  if ("runs" in subtitle) {
    playlist["description"] = (subtitle["runs"] as JsonList).map((run) => run["text"]).join("");
    if (subtitle["runs"].length === 3) {
      const sub2 = nav<string>(data, SUBTITLE2, true);
      if (sub2 && /\d+ /.test(sub2)) {
        playlist["count"] = sub2.split(" ")[0];
        playlist["author"] = parseArtistsRuns(subtitle["runs"].slice(0, 1));
      }
    }
  }
  return playlist;
}

export function parseRelatedArtist(data: JsonDict): JsonDict {
  let subscribers = nav<string>(data, SUBTITLE, true);
  if (subscribers) {
    subscribers = subscribers.split(" ")[0];
  }
  return {
    title: nav(data, TITLE_TEXT),
    browseId: nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID]),
    subscribers,
    thumbnails: nav(data, THUMBNAIL_RENDERER),
  };
}

export function parseWatchPlaylist(data: JsonDict): JsonDict {
  return {
    title: nav(data, TITLE_TEXT),
    playlistId: nav(data, NAVIGATION_WATCH_PLAYLIST_ID),
    thumbnails: nav(data, THUMBNAIL_RENDERER),
  };
}
