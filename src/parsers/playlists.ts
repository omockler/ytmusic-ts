import {
  nav,
  TWO_COLUMN_RENDERER,
  SECTION,
  CONTENT,
  THUMBNAILS,
} from "../navigation.js";
import type { JsonDict, JsonList, RequestFuncBody } from "../types.js";
import { getContinuations2025 } from "../continuations.js";
import { parsePlaylistItems } from "./library.js";

/** Strip "VL" prefix from a playlist id. */
export function validatePlaylistId(playlistId: string): string {
  return playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
}

/** Extract metadata from the playlist header's secondSubtitle. */
export function parsePlaylistHeaderMeta(header: JsonDict): JsonDict {
  const playlist: JsonDict = {
    views: null,
    duration: null,
    trackCount: null,
    title: (header["title"]?.["runs"] ?? []).map((r: JsonDict) => r["text"]).join(""),
    thumbnails: nav(header, THUMBNAILS, true) ?? null,
  };

  if ("facepile" in header) {
    const avatarRenderer = nav(header, ["facepile", "avatarStackViewModel", "rendererContext"], true);
    const avatarCommand = nav(
      avatarRenderer,
      ["commandContext", "onTap", "innertubeCommand"],
      true,
    );

    if (
      nav(avatarCommand, ["showEngagementPanelEndpoint", "identifier", "tag"], true) ===
      "PAplaylist_collaborate"
    ) {
      const avatars = nav<JsonList>(header, ["facepile", "avatarStackViewModel", "avatars"]);
      playlist["collaborators"] = {
        text: nav(avatarRenderer, ["accessibilityContext", "label"]),
        avatars: avatars.map((a: JsonDict) => a["avatarViewModel"]["image"]["sources"][0]),
      };
    } else {
      playlist["author"] = {
        name: nav(header, ["facepile", "avatarStackViewModel", "text", "content"]),
        id: nav(avatarCommand, ["browseEndpoint", "browseId"], true) ?? null,
      };
    }
  }

  if (header["secondSubtitle"] && "runs" in header["secondSubtitle"]) {
    const runs: JsonList = header["secondSubtitle"]["runs"];
    const hasViews = (runs.length > 3 ? 1 : 0) * 2;
    playlist["views"] = hasViews ? toInt(runs[0]["text"]) : null;
    const hasDuration = (runs.length > 1 ? 1 : 0) * 2;
    playlist["duration"] = hasDuration ? runs[hasViews + hasDuration]["text"] : null;
    const songCountText: string = runs[hasViews + 0]["text"];
    const songCountSearch = songCountText.match(/\d+/g);
    playlist["trackCount"] = songCountSearch ? toInt(songCountSearch.join("")) : null;
  }

  return playlist;
}

/** Parse an OLA-prefix audio playlist (simplified path). */
export async function parseAudioPlaylist(
  response: JsonDict,
  limit: number | null,
  requestFunc: RequestFuncBody,
): Promise<JsonDict> {
  const playlist: JsonDict = {
    owned: false,
    privacy: "PUBLIC",
    description: null,
    views: null,
    duration: null,
    tracks: [],
    thumbnails: [],
    related: [],
  };

  const sectionList = nav(response, [...TWO_COLUMN_RENDERER, "secondaryContents", ...SECTION]);
  const contentData = nav(sectionList, [...CONTENT, "musicPlaylistShelfRenderer"]);

  playlist["id"] = nav(contentData, ["targetId"]);

  playlist["tracks"] = [];
  if ("contents" in contentData) {
    playlist["tracks"] = parsePlaylistItems(contentData["contents"]);

    const more = await getContinuations2025(
      contentData,
      limit,
      requestFunc,
      (contents) => parsePlaylistItems(contents),
    );
    playlist["tracks"].push(...more);
  }

  playlist["trackCount"] = playlist["tracks"].length;
  playlist["title"] = playlist["tracks"].length > 0 ? playlist["tracks"][0]["album"]?.["name"] ?? "" : "";
  playlist["duration_seconds"] = sumTotalDuration(playlist);
  return playlist;
}

/** Sum duration_seconds from all tracks. */
export function sumTotalDuration(item: JsonDict): number {
  if (!("tracks" in item)) return 0;
  return (item["tracks"] as JsonList).reduce(
    (acc: number, track: JsonDict) => acc + (track["duration_seconds"] ?? 0),
    0,
  );
}

/** Parse a comma-separated number string to an integer. */
function toInt(s: string): number {
  return parseInt(s.replace(/[,.\s]/g, ""), 10) || 0;
}
