import { nav, NAVIGATION_BROWSE_ID } from "../navigation.js";
import type { JsonList } from "../types.js";

export function parseArtistsRuns(runs: JsonList): JsonList {
  const artists: JsonList = [];
  for (let j = 0; j <= Math.floor(runs.length / 2); j++) {
    artists.push({
      name: runs[j * 2]["text"],
      id: nav(runs[j * 2], NAVIGATION_BROWSE_ID, true) ?? null,
    });
  }
  return artists;
}
