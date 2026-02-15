import {
  nav,
  findObjectByKey,
  HEADER_DETAIL,
  TWO_COLUMN_RENDERER,
  TAB_CONTENT,
  SECTION_LIST_ITEM,
  RESPONSIVE_HEADER,
  TITLE_TEXT,
  SUBTITLE,
  SUBTITLE_BADGE_LABEL,
  THUMBNAIL_CROPPED,
  THUMBNAILS,
  DESCRIPTION,
  DESCRIPTION_SHELF,
  MENU,
  NAVIGATION_WATCH_PLAYLIST_ID,
  NAVIGATION_PLAYLIST_ID,
  WATCH_PID,
  WATCH_PLAYLIST_ID,
} from "../navigation.js";
import type { JsonDict } from "../types.js";
import { parseSongRuns, parseLikeStatus } from "./songs.js";
import { parseArtistsRuns } from "./artists.js";

function toInt(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ""), 10);
}

export function parseAlbumHeader(response: JsonDict): JsonDict {
  const header = nav(response, HEADER_DETAIL);
  const album: JsonDict = {
    title: nav(header, TITLE_TEXT),
    type: nav(header, SUBTITLE),
    thumbnails: nav(header, THUMBNAIL_CROPPED),
    isExplicit: nav(header, SUBTITLE_BADGE_LABEL, true) != null,
  };

  if ("description" in header) {
    album["description"] = header["description"]["runs"][0]["text"];
  }

  const albumInfo = parseSongRuns(header["subtitle"]["runs"].slice(2));
  Object.assign(album, albumInfo);

  if (header["secondSubtitle"]["runs"].length > 1) {
    album["trackCount"] = toInt(header["secondSubtitle"]["runs"][0]["text"]);
    album["duration"] = header["secondSubtitle"]["runs"][2]["text"];
  } else {
    album["duration"] = header["secondSubtitle"]["runs"][0]["text"];
  }

  const menu = nav(header, MENU);
  const toplevel = menu["topLevelButtons"];
  album["audioPlaylistId"] =
    nav(toplevel, [0, "buttonRenderer", ...NAVIGATION_WATCH_PLAYLIST_ID], true) ?? null;
  if (!album["audioPlaylistId"]) {
    album["audioPlaylistId"] =
      nav(toplevel, [0, "buttonRenderer", ...NAVIGATION_PLAYLIST_ID], true) ?? null;
  }
  const service = nav(toplevel, [1, "buttonRenderer", "defaultServiceEndpoint"], true);
  if (service) {
    album["likeStatus"] = parseLikeStatus(service);
  }

  return album;
}

export function parseAlbumHeader2024(response: JsonDict): JsonDict {
  const header = nav(response, [
    ...TWO_COLUMN_RENDERER,
    ...TAB_CONTENT,
    ...SECTION_LIST_ITEM,
    ...RESPONSIVE_HEADER,
  ]);
  const album: JsonDict = {
    title: nav(header, TITLE_TEXT),
    type: nav(header, SUBTITLE),
    thumbnails: nav(header, THUMBNAILS),
    isExplicit: nav(header, SUBTITLE_BADGE_LABEL, true) != null,
  };

  album["description"] = nav(header, ["description", ...DESCRIPTION_SHELF, ...DESCRIPTION], true) ?? null;

  const albumInfo = parseSongRuns(header["subtitle"]["runs"].slice(2));
  const straplineRuns = nav(header, ["straplineTextOne", "runs"], true);
  albumInfo["artists"] = straplineRuns ? parseArtistsRuns(straplineRuns) : null;
  Object.assign(album, albumInfo);

  if (header["secondSubtitle"]["runs"].length > 1) {
    album["trackCount"] = toInt(header["secondSubtitle"]["runs"][0]["text"]);
    album["duration"] = header["secondSubtitle"]["runs"][2]["text"];
  } else {
    album["duration"] = header["secondSubtitle"]["runs"][0]["text"];
  }

  const buttons = header["buttons"];
  album["audioPlaylistId"] =
    nav(
      findObjectByKey(buttons, "musicPlayButtonRenderer"),
      ["musicPlayButtonRenderer", "playNavigationEndpoint", ...WATCH_PID],
      true,
    ) ?? null;
  if (album["audioPlaylistId"] == null) {
    album["audioPlaylistId"] =
      nav(
        findObjectByKey(buttons, "musicPlayButtonRenderer"),
        ["musicPlayButtonRenderer", "playNavigationEndpoint", ...WATCH_PLAYLIST_ID],
        true,
      ) ?? null;
  }
  const service = nav(
    findObjectByKey(buttons, "toggleButtonRenderer"),
    ["toggleButtonRenderer", "defaultServiceEndpoint"],
    true,
  );
  album["likeStatus"] = "INDIFFERENT";
  if (service) {
    album["likeStatus"] = parseLikeStatus(service);
  }

  return album;
}

export function parseAlbumPlaylistIdIfExists(data: JsonDict | null | undefined): string | null {
  if (!data) return null;
  return nav<string>(data, WATCH_PID, true) ?? nav<string>(data, WATCH_PLAYLIST_ID, true) ?? null;
}
