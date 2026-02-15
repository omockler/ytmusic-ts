import {
  nav,
  TITLE_TEXT,
  TITLE,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_VIDEO_TYPE,
  THUMBNAILS,
  THUMBNAIL_RENDERER,
  ICON_TYPE,
  TEXT_RUN_TEXT,
  PLAY_BUTTON,
} from "../navigation.js";
import type { JsonDict } from "../types.js";
import { getFlexColumnItem } from "./utils.js";
import { parseSongFlat } from "./browsing.js";

const TRENDS: Record<string, string> = {
  ARROW_DROP_UP: "up",
  ARROW_DROP_DOWN: "down",
  ARROW_CHART_NEUTRAL: "neutral",
};

export function parseChartSong(data: JsonDict): JsonDict {
  const parsed = parseSongFlat(data, true);
  Object.assign(parsed, parseRanking(data, false));
  return parsed;
}

export function parseTrendingItem(data: JsonDict): JsonDict {
  const videoType = nav<string>(
    data,
    [...PLAY_BUTTON, "playNavigationEndpoint", ...NAVIGATION_VIDEO_TYPE],
  );
  if (videoType === "MUSIC_VIDEO_TYPE_PODCAST_EPISODE") {
    // Simplified - just return flat song for episodes in trending
    return parseSongFlat(data, true);
  }
  return parseSongFlat(data, true);
}

export function parseChartPlaylist(data: JsonDict): JsonDict {
  return {
    title: nav(data, TITLE_TEXT),
    playlistId: (nav<string>(data, [...TITLE, ...NAVIGATION_BROWSE_ID])).substring(2),
    thumbnails: nav(data, THUMBNAIL_RENDERER),
  };
}

export function parseChartArtist(data: JsonDict): JsonDict {
  const subItem = getFlexColumnItem(data, 1);
  const subscribers: string | null = subItem
    ? nav<string>(subItem, TEXT_RUN_TEXT).split(" ")[0]
    : null;

  const parsed: JsonDict = {
    title: nav(getFlexColumnItem(data, 0), TEXT_RUN_TEXT),
    browseId: nav(data, NAVIGATION_BROWSE_ID),
    subscribers,
    thumbnails: nav(data, THUMBNAILS),
  };
  Object.assign(parsed, parseRanking(data, true));
  return parsed;
}

export function parseRanking(data: JsonDict, noneIfAbsent: boolean): JsonDict {
  const trendIconType = noneIfAbsent
    ? nav<string>(data, ["customIndexColumn", "musicCustomIndexColumnRenderer", ...ICON_TYPE], true)
    : nav<string>(data, ["customIndexColumn", "musicCustomIndexColumnRenderer", ...ICON_TYPE]);

  return {
    rank: noneIfAbsent
      ? nav(data, ["customIndexColumn", "musicCustomIndexColumnRenderer", ...TEXT_RUN_TEXT], true) ?? null
      : nav(data, ["customIndexColumn", "musicCustomIndexColumnRenderer", ...TEXT_RUN_TEXT]),
    trend: trendIconType != null ? TRENDS[trendIconType] ?? null : null,
  };
}
