import type { YTMusic } from "../ytmusic.js";
import type { JsonDict, JsonList } from "../types.js";
import {
  nav,
  TWO_COLUMN_RENDERER,
  TAB_CONTENT,
  SECTION_LIST_ITEM,
  SECTION,
  CONTENT,
  RESPONSIVE_HEADER,
  EDITABLE_PLAYLIST_DETAIL_HEADER,
  HEADER,
  PLAYLIST_ID,
  WATCH_PLAYLIST_ID,
  DESCRIPTION_SHELF,
  SUBTITLE_RUNS,
  SECTION_LIST_CONTINUATION,
  MUSIC_SHELF,
  CAROUSEL,
} from "../navigation.js";
import {
  getContinuationParams,
  getContinuationContents,
  getContinuations2025,
  getReloadableContinuations,
} from "../continuations.js";
import { parsePlaylistItems } from "../parsers/library.js";
import { parseSongRuns } from "../parsers/songs.js";
import { parseContentList, parsePlaylist } from "../parsers/browsing.js";
import {
  validatePlaylistId,
  parsePlaylistHeaderMeta,
  parseAudioPlaylist,
  sumTotalDuration,
} from "../parsers/playlists.js";
import type { PrivacyStatus } from "../models/playlists.js";
import { YTMusicError } from "../errors.js";

/** Strip HTML tags from a string. */
function htmlToTxt(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

/** Get a playlist's contents. */
export async function getPlaylist(
  ytmusic: YTMusic,
  playlistId: string,
  limit: number | null = 100,
  related = false,
  suggestionsLimit = 0,
): Promise<JsonDict> {
  const browseId = playlistId.startsWith("VL") ? playlistId : "VL" + playlistId;
  const body: JsonDict = { browseId };
  const endpoint = "browse";

  const requestFunc = (additionalParams: string) =>
    ytmusic.sendRequest(endpoint, body, additionalParams);
  const response = await requestFunc("");

  const requestFuncBody = (reqBody: JsonDict) =>
    ytmusic.sendRequest(endpoint, reqBody);

  if (playlistId.startsWith("OLA") || playlistId.startsWith("VLOLA")) {
    return parseAudioPlaylist(response, limit, requestFuncBody);
  }

  const headerData = nav(response, [...TWO_COLUMN_RENDERER, ...TAB_CONTENT, ...SECTION_LIST_ITEM]);
  const sectionList = nav(response, [...TWO_COLUMN_RENDERER, "secondaryContents", ...SECTION]);
  const playlist: JsonDict = {};

  playlist["owned"] = EDITABLE_PLAYLIST_DETAIL_HEADER[0] in headerData;
  let header: JsonDict;
  if (!playlist["owned"]) {
    header = nav(headerData, RESPONSIVE_HEADER);
    playlist["id"] = nav(
      header,
      ["buttons", 1, "musicPlayButtonRenderer", "playNavigationEndpoint", ...WATCH_PLAYLIST_ID],
      true,
    ) ?? null;
    playlist["privacy"] = "PUBLIC";
  } else {
    playlist["id"] = nav(headerData, [...EDITABLE_PLAYLIST_DETAIL_HEADER, ...PLAYLIST_ID]);
    header = nav(headerData, [...EDITABLE_PLAYLIST_DETAIL_HEADER, ...HEADER, ...RESPONSIVE_HEADER]);
    playlist["privacy"] = headerData[EDITABLE_PLAYLIST_DETAIL_HEADER[0]]["editHeader"][
      "musicPlaylistEditHeaderRenderer"
    ]["privacy"];
  }

  const descriptionShelf = nav(header, ["description", ...DESCRIPTION_SHELF], true);
  playlist["description"] = descriptionShelf
    ? (descriptionShelf["description"]["runs"] as JsonList).map((r: JsonDict) => r["text"]).join("")
    : null;

  Object.assign(playlist, parsePlaylistHeaderMeta(header));
  const isCollaborative = "collaborators" in playlist;

  Object.assign(
    playlist,
    parseSongRuns(nav<JsonList>(header, SUBTITLE_RUNS).slice(2 + (playlist["owned"] ? 2 : 0))),
  );

  // suggestions and related are missing e.g. on liked songs
  playlist["related"] = [];
  if ("continuations" in sectionList) {
    let additionalParams = getContinuationParams(sectionList);
    if (playlist["owned"] && (suggestionsLimit > 0 || related)) {
      const suggested = await requestFunc(additionalParams);
      const continuation = nav(suggested, SECTION_LIST_CONTINUATION);
      additionalParams = getContinuationParams(continuation);
      const suggestionsShelf = nav(continuation, [...CONTENT, ...MUSIC_SHELF]);
      playlist["suggestions"] = getContinuationContents(
        suggestionsShelf,
        (results) => parsePlaylistItems(results),
      );

      const moreSuggestions = await getReloadableContinuations(
        suggestionsShelf,
        "musicShelfContinuation",
        suggestionsLimit - (playlist["suggestions"] as JsonList).length,
        (params) => requestFunc(params),
        (results) => parsePlaylistItems(results),
      );
      (playlist["suggestions"] as JsonList).push(...moreSuggestions);
    }

    if (related) {
      const relatedResponse = await requestFunc(additionalParams);
      const relatedContinuation = nav(relatedResponse, SECTION_LIST_CONTINUATION, true);
      if (relatedContinuation) {
        playlist["related"] = getContinuationContents(
          nav(relatedContinuation, [...CONTENT, ...CAROUSEL]),
          (results) => parseContentList(results, parsePlaylist),
        );
      }
    }
  }

  playlist["tracks"] = [];
  const contentData = nav(sectionList, [...CONTENT, "musicPlaylistShelfRenderer"]);
  if ("contents" in contentData) {
    playlist["tracks"] = parsePlaylistItems(contentData["contents"], isCollaborative);

    const more = await getContinuations2025(
      contentData,
      limit,
      requestFuncBody,
      (contents) => parsePlaylistItems(contents, isCollaborative),
    );
    (playlist["tracks"] as JsonList).push(...more);
  }

  playlist["duration_seconds"] = sumTotalDuration(playlist);
  return playlist;
}

/** Create a new playlist. */
export async function createPlaylist(
  ytmusic: YTMusic,
  title: string,
  description: string,
  privacyStatus: PrivacyStatus = "PRIVATE",
  videoIds?: string[],
  sourcePlaylist?: string,
): Promise<string | JsonDict> {
  ytmusic.checkAuth();

  const invalidChars = ["<", ">"];
  const found = invalidChars.filter((c) => title.includes(c));
  if (found.length > 0) {
    throw new YTMusicError(`${title} contains invalid characters: ${found.join(", ")}`);
  }

  const body: JsonDict = {
    title,
    description: htmlToTxt(description),
    privacyStatus,
  };

  if (videoIds) {
    body["videoIds"] = videoIds;
  }
  if (sourcePlaylist) {
    body["sourcePlaylistId"] = sourcePlaylist;
  }

  const response = await ytmusic.sendRequest("playlist/create", body);
  return "playlistId" in response ? response["playlistId"] : response;
}

/** Edit a playlist's metadata. */
export async function editPlaylist(
  ytmusic: YTMusic,
  playlistId: string,
  title?: string,
  description?: string,
  privacyStatus?: PrivacyStatus,
  moveItem?: string | [string, string],
  addPlaylistId?: string,
  addToTop?: boolean,
): Promise<string | JsonDict> {
  ytmusic.checkAuth();
  const body: JsonDict = { playlistId: validatePlaylistId(playlistId) };
  const actions: JsonDict[] = [];

  if (title !== undefined) {
    actions.push({ action: "ACTION_SET_PLAYLIST_NAME", playlistName: title });
  }
  if (description !== undefined) {
    actions.push({ action: "ACTION_SET_PLAYLIST_DESCRIPTION", playlistDescription: description });
  }
  if (privacyStatus !== undefined) {
    actions.push({ action: "ACTION_SET_PLAYLIST_PRIVACY", playlistPrivacy: privacyStatus });
  }
  if (moveItem) {
    const action: JsonDict = {
      action: "ACTION_MOVE_VIDEO_BEFORE",
      setVideoId: typeof moveItem === "string" ? moveItem : moveItem[0],
    };
    if (Array.isArray(moveItem) && moveItem.length > 1) {
      action["movedSetVideoIdSuccessor"] = moveItem[1];
    }
    actions.push(action);
  }
  if (addPlaylistId) {
    actions.push({ action: "ACTION_ADD_PLAYLIST", addedFullListId: addPlaylistId });
  }
  // Fix for Python bug: only one action for addToTop
  if (addToTop !== undefined) {
    actions.push({ action: "ACTION_SET_ADD_TO_TOP", addToTop: String(addToTop) });
  }

  body["actions"] = actions;
  const response = await ytmusic.sendRequest("browse/edit_playlist", body);
  return "status" in response ? response["status"] : response;
}

/** Delete a playlist. */
export async function deletePlaylist(
  ytmusic: YTMusic,
  playlistId: string,
): Promise<string | JsonDict> {
  ytmusic.checkAuth();
  const body = { playlistId: validatePlaylistId(playlistId) };
  const response = await ytmusic.sendRequest("playlist/delete", body);
  return "status" in response ? response["status"] : response;
}

/** Add songs to a playlist. */
export async function addPlaylistItems(
  ytmusic: YTMusic,
  playlistId: string,
  videoIds?: string[],
  sourcePlaylist?: string,
  duplicates = false,
): Promise<JsonDict> {
  ytmusic.checkAuth();
  const body: JsonDict = { playlistId: validatePlaylistId(playlistId), actions: [] };

  if (!videoIds && !sourcePlaylist) {
    throw new YTMusicError(
      "You must provide either videoIds or a source_playlist to add to the playlist",
    );
  }

  if (videoIds) {
    for (const videoId of videoIds) {
      const action: JsonDict = { action: "ACTION_ADD_VIDEO", addedVideoId: videoId };
      if (duplicates) {
        action["dedupeOption"] = "DEDUPE_OPTION_SKIP";
      }
      body["actions"].push(action);
    }
  }

  if (sourcePlaylist) {
    body["actions"].push({ action: "ACTION_ADD_PLAYLIST", addedFullListId: sourcePlaylist });
    if (!videoIds) {
      body["actions"].push({ action: "ACTION_ADD_VIDEO", addedVideoId: null });
    }
  }

  const response = await ytmusic.sendRequest("browse/edit_playlist", body);
  if ("status" in response && (response["status"] as string).includes("SUCCEEDED")) {
    const resultDict = (response["playlistEditResults"] ?? []).map(
      (r: JsonDict) => r["playlistEditVideoAddedResultData"] ?? null,
    );
    return { status: response["status"], playlistEditResults: resultDict };
  }
  return response;
}

/** Remove songs from a playlist. */
export async function removePlaylistItems(
  ytmusic: YTMusic,
  playlistId: string,
  videos: JsonList,
): Promise<string | JsonDict> {
  ytmusic.checkAuth();
  const filtered = videos.filter((v) => "videoId" in v && "setVideoId" in v);
  if (filtered.length === 0) {
    throw new YTMusicError(
      "Cannot remove songs, because setVideoId is missing. Do you own this playlist?",
    );
  }

  const body: JsonDict = { playlistId: validatePlaylistId(playlistId), actions: [] };
  for (const video of filtered) {
    body["actions"].push({
      setVideoId: video["setVideoId"],
      removedVideoId: video["videoId"],
      action: "ACTION_REMOVE_VIDEO",
    });
  }

  const response = await ytmusic.sendRequest("browse/edit_playlist", body);
  return "status" in response ? response["status"] : response;
}
