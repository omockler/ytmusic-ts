import type { YTMusic } from "../ytmusic.js";
import type { JsonDict, JsonList } from "../types.js";
import {
  nav,
  SINGLE_COLUMN_TAB,
  SECTION_LIST,
  GRID,
  GRID_ITEMS,
  TITLE_TEXT,
  CAROUSEL,
  CAROUSEL_CONTENTS,
  CAROUSEL_TITLE,
  CATEGORY_TITLE,
  CATEGORY_PARAMS,
  NAVIGATION_BROWSE_ID,
  MRLIR,
  MTRIR,
} from "../navigation.js";
import { parseContentList, parseAlbum, parsePlaylist, parseVideo } from "../parsers/browsing.js";
import { parseChartSong, parseTrendingItem } from "../parsers/explore.js";

export async function getMoodCategories(ytmusic: YTMusic): Promise<JsonDict> {
  const sections: JsonDict = {};
  const response = await ytmusic.sendRequest("browse", {
    browseId: "FEmusic_moods_and_genres",
  });

  for (const section of nav<JsonList>(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST])) {
    const title = nav<string>(section, [...GRID, "header", "gridHeaderRenderer", ...TITLE_TEXT]);
    sections[title] = [];
    for (const category of nav<JsonList>(section, GRID_ITEMS)) {
      sections[title].push({
        title: nav(category, CATEGORY_TITLE),
        params: nav(category, CATEGORY_PARAMS),
      });
    }
  }

  return sections;
}

export async function getMoodPlaylists(ytmusic: YTMusic, params: string): Promise<JsonList> {
  const playlists: JsonList = [];
  const response = await ytmusic.sendRequest("browse", {
    browseId: "FEmusic_moods_and_genres_category",
    params,
  });

  for (const section of nav<JsonList>(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST])) {
    let path: readonly (string | number)[] = [];
    if ("gridRenderer" in section) {
      path = GRID_ITEMS;
    } else if ("musicCarouselShelfRenderer" in section) {
      path = CAROUSEL_CONTENTS;
    } else if ("musicImmersiveCarouselShelfRenderer" in section) {
      path = ["musicImmersiveCarouselShelfRenderer", "contents"];
    }
    if (path.length) {
      const results = nav<JsonList>(section, path);
      playlists.push(...parseContentList(results, parsePlaylist));
    }
  }

  return playlists;
}

export async function getExplore(ytmusic: YTMusic): Promise<JsonDict> {
  const body: JsonDict = { browseId: "FEmusic_explore" };
  const response = await ytmusic.sendRequest("browse", body);
  const results = nav<JsonList>(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]);

  const explore: JsonDict = {};

  for (const result of results) {
    const browseId = nav<string>(
      result,
      [...CAROUSEL, ...CAROUSEL_TITLE, ...NAVIGATION_BROWSE_ID],
      true,
    );
    if (browseId == null) continue;

    const contents = nav<JsonList>(result, CAROUSEL_CONTENTS);

    if (browseId === "FEmusic_new_releases_albums") {
      explore["new_releases"] = parseContentList(contents, parseAlbum);
    } else if (browseId === "FEmusic_moods_and_genres") {
      explore["moods_and_genres"] = contents.map((genre) => ({
        title: nav(genre, CATEGORY_TITLE),
        params: nav(genre, CATEGORY_PARAMS),
      }));
    } else if (browseId === "FEmusic_new_releases_videos") {
      explore["new_videos"] = parseContentList(contents, parseVideo, MTRIR);
    } else if (browseId.startsWith("VLPL")) {
      explore["top_songs"] = {
        playlist: browseId,
        items: parseContentList(contents, parseChartSong, MRLIR),
      };
    } else if (browseId.startsWith("VLOLA")) {
      explore["trending"] = {
        playlist: browseId,
        items: parseContentList(contents, parseTrendingItem, MRLIR),
      };
    }
  }

  return explore;
}
