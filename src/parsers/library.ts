import {
  nav,
  findObjectByKey,
  SINGLE_COLUMN_TAB,
  SINGLE_COLUMN,
  TAB_1_CONTENT,
  TAB_2_CONTENT,
  SECTION_LIST,
  SECTION_LIST_ITEM,
  ITEM_SECTION,
  MUSIC_SHELF,
  GRID,
  MRLIR,
  MTRIR,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_BROWSE,
  PAGE_TYPE,
  THUMBNAILS,
  THUMBNAIL_RENDERER,
  TITLE,
  TITLE_TEXT,
  SUBTITLE,
  MENU_PLAYLIST_ID,
  PLAY_BUTTON,
  MENU_ITEMS,
  MENU_LIKE_STATUS,
  MENU_SERVICE,
  NAVIGATION_VIDEO_TYPE,
  MNIR,
  TEXT_RUN,
  BADGE_LABEL,
} from "../navigation.js";
import type { JsonDict, JsonList } from "../types.js";
import { getFlexColumnItem, getItemText, parseMenuPlaylists, parseDuration } from "./utils.js";
import { parseSongRun, parseSongRuns, parseSongArtists, parseSongAlbum, parseSongMenuData } from "./songs.js";

/**
 * Find library contents from the browse response.
 * Supports multiple response layouts for different user configurations.
 */
export function getLibraryContents(
  response: JsonDict,
  renderer: readonly (string | number)[],
): JsonDict | null {
  const section = nav<JsonList>(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST], true);
  if (section == null) {
    const numTabs = nav<JsonList>(response, [...SINGLE_COLUMN, "tabs"]).length;
    const libraryTab = numTabs < 3 ? TAB_1_CONTENT : TAB_2_CONTENT;
    return nav(response, [...SINGLE_COLUMN, ...libraryTab, ...SECTION_LIST_ITEM, ...renderer], true) ?? null;
  }

  const results = findObjectByKey(section, "itemSectionRenderer");
  if (results == null) {
    return nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM, ...renderer], true) ?? null;
  }
  return nav(results, [...ITEM_SECTION, ...renderer], true) ?? null;
}

/** Parse library songs response into results + parsed songs. */
export function parseLibrarySongs(response: JsonDict): JsonDict {
  const results = getLibraryContents(response, MUSIC_SHELF);
  if (!results) return { results: null, parsed: null };
  // Skip the random mix that conditionally appears at the start (avoid mutating input)
  const contents = results["contents"]?.length >= 2
    ? results["contents"].slice(1)
    : results["contents"] ?? [];
  return {
    results,
    parsed: parsePlaylistItems(contents),
  };
}

/** Parse a list of playlist items (MRLIR format). */
export function parsePlaylistItems(results: JsonList, isCollaborative = false): JsonList {
  const songs: JsonList = [];
  for (const result of results) {
    if (!(MRLIR in result)) continue;
    const data = result[MRLIR];
    const song = parsePlaylistItem(data, false, isCollaborative);
    if (song) songs.push(song);
  }
  return songs;
}

/** Parse a single playlist item. */
export function parsePlaylistItem(data: JsonDict, isAlbum = false, isCollaborative = false): JsonDict | null {
  let videoId: string | null = null;
  let setVideoId: string | null = null;
  let like: string | null = null;

  // Extract setVideoId and videoId from menu
  if ("menu" in data) {
    for (const item of nav<JsonList>(data, MENU_ITEMS)) {
      if ("menuServiceItemRenderer" in item) {
        const menuService = nav(item, MENU_SERVICE);
        if ("playlistEditEndpoint" in menuService) {
          setVideoId = nav(menuService, ["playlistEditEndpoint", "actions", 0, "setVideoId"], true) ?? null;
          videoId = nav(menuService, ["playlistEditEndpoint", "actions", 0, "removedVideoId"], true) ?? null;
        }
      }
    }
  }

  const songMenuData: JsonDict = { inLibrary: null, pinnedToListenAgain: null, ...parseSongMenuData(data) };

  // Get videoId from play button if available
  const playButton = nav(data, PLAY_BUTTON, true);
  if (playButton != null && "playNavigationEndpoint" in playButton) {
    videoId = playButton["playNavigationEndpoint"]["watchEndpoint"]["videoId"];
    if ("menu" in data) {
      like = nav<string>(data, MENU_LIKE_STATUS, true) ?? null;
    }
  }

  let isAvailable = true;
  if ("musicItemRendererDisplayPolicy" in data) {
    isAvailable = data["musicItemRendererDisplayPolicy"] !== "MUSIC_ITEM_RENDERER_DISPLAY_POLICY_GREY_OUT";
  }

  const usePresetColumns = (!isAvailable || isAlbum) ? true : null;

  let titleIndex: number | null = usePresetColumns ? 0 : null;
  let artistIndex: number | null = usePresetColumns ? 1 : null;
  let durationIndex: number | null = null;
  // collaborative playlists have duration in flexColumns (between artist and album)
  let albumIndex: number | null = isCollaborative ? 3 : usePresetColumns ? 2 : null;
  const userChannelIndexes: number[] = [];
  let unrecognizedIndex: number | null = null;

  for (let index = 0; index < (data["flexColumns"]?.length ?? 0); index++) {
    const flexColumnItem = getFlexColumnItem(data, index);
    if (!flexColumnItem) continue;
    const navigationEndpoint = nav(flexColumnItem, [...TEXT_RUN, "navigationEndpoint"], true);

    if (!navigationEndpoint) {
      const run = nav(flexColumnItem, TEXT_RUN, true);
      if (run && "text" in run) {
        const parsed = parseSongRun(run);
        if (parsed["type"] === "duration") {
          durationIndex = index;
        } else {
          unrecognizedIndex = unrecognizedIndex ?? index;
        }
      }
      continue;
    }

    if ("watchEndpoint" in navigationEndpoint) {
      titleIndex = index;
    } else if ("browseEndpoint" in navigationEndpoint) {
      const pageType = nav<string>(navigationEndpoint, ["browseEndpoint", ...PAGE_TYPE]);
      if (pageType === "MUSIC_PAGE_TYPE_ARTIST" || pageType === "MUSIC_PAGE_TYPE_UNKNOWN") {
        artistIndex = index;
      } else if (pageType === "MUSIC_PAGE_TYPE_ALBUM" || pageType === "MUSIC_PAGE_TYPE_AUDIOBOOK") {
        albumIndex = index;
      } else if (pageType === "MUSIC_PAGE_TYPE_USER_CHANNEL") {
        userChannelIndexes.push(index);
      } else if (pageType === "MUSIC_PAGE_TYPE_NON_MUSIC_AUDIO_TRACK_PAGE") {
        titleIndex = index;
      }
    }
  }

  if (artistIndex == null && unrecognizedIndex != null) {
    artistIndex = unrecognizedIndex;
  }
  if (artistIndex == null && userChannelIndexes.length > 0) {
    artistIndex = userChannelIndexes[userChannelIndexes.length - 1];
  }

  const title = titleIndex != null ? getItemText(data, titleIndex) : null;
  if (title === "Song deleted") return null;

  const artists = artistIndex != null ? parseSongArtists(data, artistIndex) : null;
  const album = albumIndex != null ? parseSongAlbum(data, albumIndex) : null;

  let duration: string | null = durationIndex != null ? getItemText(data, durationIndex) : null;
  if ("fixedColumns" in data) {
    const fixedCol = data["fixedColumns"]?.[0]?.["musicResponsiveListItemFixedColumnRenderer"];
    if (fixedCol && "text" in fixedCol) {
      if ("simpleText" in fixedCol["text"]) {
        duration = fixedCol["text"]["simpleText"];
      } else if (fixedCol["text"]["runs"]?.[0]) {
        duration = fixedCol["text"]["runs"][0]["text"];
      }
    }
  }

  const thumbnails = nav(data, THUMBNAILS, true) ?? null;
  const isExplicit = nav(data, BADGE_LABEL, true) != null;

  const videoType = nav<string>(
    data,
    [...MENU_ITEMS, 0, MNIR, "navigationEndpoint", ...NAVIGATION_VIDEO_TYPE],
    true,
  ) ?? null;

  const song: JsonDict = {
    videoId,
    title,
    artists,
    album,
    likeStatus: like,
    ...songMenuData,
    thumbnails,
    isAvailable,
    isExplicit,
    videoType,
  };

  if (duration) {
    song["duration"] = duration;
    song["duration_seconds"] = parseDuration(duration);
  }
  if (setVideoId) {
    song["setVideoId"] = setVideoId;
  }

  return song;
}

/** Parse library albums from response. */
export function parseLibraryAlbums(
  response: JsonDict,
): { results: JsonDict | null; albums: JsonList } {
  const results = getLibraryContents(response, GRID);
  if (results == null) return { results: null, albums: [] };
  const albums = parseAlbums(results["items"]);
  return { results, albums };
}

/** Parse album items (MTRIR format) from library. */
export function parseAlbums(results: JsonList): JsonList {
  const albums: JsonList = [];
  for (const result of results) {
    if (!(MTRIR in result)) continue;
    const data = result[MTRIR];
    const album: JsonDict = {
      browseId: nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID]),
      playlistId: nav(data, MENU_PLAYLIST_ID, true) ?? null,
      title: nav(data, TITLE_TEXT),
      thumbnails: nav(data, THUMBNAIL_RENDERER),
    };

    if ("runs" in data["subtitle"]) {
      album["type"] = nav(data, SUBTITLE);
      Object.assign(album, parseSongRuns(data["subtitle"]["runs"].slice(2)));
    }

    albums.push(album);
  }
  return albums;
}

/** Parse library artists from response. */
export function parseLibraryArtists(
  response: JsonDict,
): { results: JsonDict | null; artists: JsonList } {
  const results = getLibraryContents(response, MUSIC_SHELF);
  if (results == null) return { results: null, artists: [] };
  const artists = parseArtists(results["contents"]);
  return { results, artists };
}

/** Parse artist items (MRLIR format) from library. */
export function parseArtists(results: JsonList): JsonList {
  const artists: JsonList = [];
  for (const result of results) {
    if (!(MRLIR in result)) continue;
    const data = result[MRLIR];
    const artist: JsonDict = {
      browseId: nav(data, NAVIGATION_BROWSE_ID),
      artist: getItemText(data, 0),
    };

    const pageType = nav<string>(data, [...NAVIGATION_BROWSE, ...PAGE_TYPE], true);
    if (pageType === "MUSIC_PAGE_TYPE_USER_CHANNEL") {
      artist["type"] = "channel";
    } else if (pageType === "MUSIC_PAGE_TYPE_ARTIST") {
      artist["type"] = "artist";
    }

    parseMenuPlaylists(data, artist);

    const subtitle = getItemText(data, 1);
    if (subtitle) {
      artist["subscribers"] = subtitle.split(" ")[0];
    }

    artist["thumbnails"] = nav(data, THUMBNAILS, true) ?? null;
    artists.push(artist);
  }
  return artists;
}
