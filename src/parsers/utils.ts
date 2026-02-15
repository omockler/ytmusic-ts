import {
  nav,
  findObjectsByKey,
  MENU_ITEMS,
  MNIR,
  ICON_TYPE,
  NAVIGATION_BROWSE_ID,
} from "../navigation.js";
import type { JsonDict, JsonList } from "../types.js";

export const DOT_SEPARATOR_RUN: JsonDict = { text: " \u2022 " };

export function parseMenuPlaylists(data: JsonDict, result: JsonDict): void {
  const menuItems = nav(data, MENU_ITEMS, true);
  if (menuItems == null) {
    return;
  }
  const watchMenu = findObjectsByKey(menuItems, MNIR);
  for (const entry of watchMenu) {
    const item = entry[MNIR];
    const icon = nav(item, ICON_TYPE);
    let watchKey: string;
    if (icon === "MUSIC_SHUFFLE") {
      watchKey = "shuffleId";
    } else if (icon === "MIX") {
      watchKey = "radioId";
    } else {
      continue;
    }

    let watchId = nav<string>(item, ["navigationEndpoint", "watchPlaylistEndpoint", "playlistId"], true);
    if (!watchId) {
      watchId = nav<string>(item, ["navigationEndpoint", "watchEndpoint", "playlistId"], true);
    }
    if (watchId) {
      result[watchKey] = watchId;
    }
  }
}

export function getItemText(
  item: JsonDict,
  index: number,
  runIndex = 0,
  noneIfAbsent = false,
): string | null {
  const column = getFlexColumnItem(item, index);
  if (!column) {
    return null;
  }
  if (noneIfAbsent && column["text"]["runs"].length < runIndex + 1) {
    return null;
  }
  return column["text"]["runs"][runIndex]["text"] as string;
}

export function getFlexColumnItem(item: JsonDict, index: number): JsonDict | null {
  if (
    item["flexColumns"].length <= index ||
    !("text" in item["flexColumns"][index]["musicResponsiveListItemFlexColumnRenderer"]) ||
    !("runs" in item["flexColumns"][index]["musicResponsiveListItemFlexColumnRenderer"]["text"])
  ) {
    return null;
  }
  return item["flexColumns"][index]["musicResponsiveListItemFlexColumnRenderer"] as JsonDict;
}

export function getFixedColumnItem(item: JsonDict, index: number): JsonDict | null {
  if (
    !("text" in item["fixedColumns"][index]["musicResponsiveListItemFixedColumnRenderer"]) ||
    !("runs" in item["fixedColumns"][index]["musicResponsiveListItemFixedColumnRenderer"]["text"])
  ) {
    return null;
  }
  return item["fixedColumns"][index]["musicResponsiveListItemFixedColumnRenderer"] as JsonDict;
}

export function getDotSeparatorIndex(runs: JsonList): number {
  const index = runs.findIndex(
    (r) => r["text"] === DOT_SEPARATOR_RUN["text"],
  );
  return index === -1 ? runs.length : index;
}

export function parseDuration(duration: string | null | undefined): number | null {
  if (!duration || !duration.trim()) {
    return null;
  }
  const parts = duration.trim().split(":");
  for (const d of parts) {
    if (!/^\d+$/.test(d)) {
      return null;
    }
  }
  const multipliers = [1, 60, 3600];
  const reversed = [...parts].reverse();
  let seconds = 0;
  for (let i = 0; i < reversed.length && i < multipliers.length; i++) {
    seconds += multipliers[i] * parseInt(reversed[i], 10);
  }
  return seconds;
}

export function parseIdName(subRun: JsonDict | null | undefined): JsonDict {
  return {
    id: nav(subRun, NAVIGATION_BROWSE_ID, true) ?? null,
    name: nav(subRun, ["text"], true) ?? null,
  };
}
