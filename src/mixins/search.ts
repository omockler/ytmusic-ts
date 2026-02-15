import type { YTMusic } from "../ytmusic.js";
import { YTMusicError } from "../errors.js";
import type { JsonDict, JsonList } from "../types.js";
import { SECTION_LIST, MUSIC_SHELF, TITLE_TEXT, TEXT_RUN_TEXT } from "../navigation.js";
import { nav } from "../navigation.js";
import { getContinuations } from "../continuations.js";
import {
  getSearchParams,
  parseSearchResults,
  parseSearchSuggestions,
  parseTopResult,
  ALL_RESULT_TYPES,
} from "../parsers/search.js";

const FILTERS = [
  "albums",
  "artists",
  "playlists",
  "community_playlists",
  "featured_playlists",
  "songs",
  "videos",
  "profiles",
  "podcasts",
  "episodes",
];

const SCOPES = ["library", "uploads"];

export async function search(
  ytmusic: YTMusic,
  query: string,
  filter?: string | null,
  scope?: string | null,
  limit = 20,
  ignoreSpelling = false,
): Promise<JsonList> {
  const body: JsonDict = { query };
  const endpoint = "search";
  const searchResults: JsonList = [];

  if (filter && !FILTERS.includes(filter)) {
    throw new YTMusicError(
      "Invalid filter provided. Please use one of the following filters or leave out the parameter: " +
        FILTERS.join(", "),
    );
  }

  if (scope && !SCOPES.includes(scope)) {
    throw new YTMusicError(
      "Invalid scope provided. Please use one of the following scopes or leave out the parameter: " +
        SCOPES.join(", "),
    );
  }

  if (scope === "uploads" && filter) {
    throw new YTMusicError(
      "No filter can be set when searching uploads. Please unset the filter parameter when scope is set to uploads.",
    );
  }

  if (scope === "library" && filter && (filter === "community_playlists" || filter === "featured_playlists")) {
    throw new YTMusicError(
      `${filter} cannot be set when searching library.`,
    );
  }

  const params = getSearchParams(filter, scope, ignoreSpelling);
  if (params) {
    body["params"] = params;
  }

  const response = await ytmusic.sendRequest(endpoint, body);

  if (!("contents" in response)) {
    return searchResults;
  }

  let results: JsonDict;
  if ("tabbedSearchResultsRenderer" in response["contents"]) {
    const tabIndex = !scope || filter ? 0 : SCOPES.indexOf(scope) + 1;
    results =
      response["contents"]["tabbedSearchResultsRenderer"]["tabs"][tabIndex]["tabRenderer"]["content"];
  } else {
    results = response["contents"];
  }

  const sectionList = nav<JsonList>(results, SECTION_LIST);

  if (sectionList.length === 1 && "itemSectionRenderer" in sectionList[0]) {
    return searchResults;
  }

  let resultType: string | null = null;
  let effectiveFilter = filter;
  if (filter && filter.includes("playlists")) {
    effectiveFilter = "playlists";
  } else if (scope === "uploads") {
    effectiveFilter = "uploads";
    resultType = "upload";
  }

  // Use English-only search result types for now (i18n not yet supported)
  const searchResultTypes = ALL_RESULT_TYPES.map((t) => t.toLowerCase());

  for (const res of sectionList) {
    let category: string | null = null;
    let shelfContents: JsonList;

    if ("musicCardShelfRenderer" in res) {
      const topResult = parseTopResult(res["musicCardShelfRenderer"], searchResultTypes);
      searchResults.push(topResult);
      const maybeContents = nav<JsonList>(res, ["musicCardShelfRenderer", "contents"], true);
      if (!maybeContents) continue;
      shelfContents = maybeContents;
      if ("messageRenderer" in shelfContents[0]) {
        category = nav(shelfContents.shift()!, ["messageRenderer", ...TEXT_RUN_TEXT]);
      }
    } else if ("musicShelfRenderer" in res) {
      shelfContents = res["musicShelfRenderer"]["contents"];
      category = nav<string>(res, [...MUSIC_SHELF, ...TITLE_TEXT], true) ?? null;
      if (effectiveFilter && scope !== "uploads") {
        resultType = effectiveFilter.replace(/s$/, "").toLowerCase();
      }
    } else {
      continue;
    }

    searchResults.push(...parseSearchResults(shelfContents, resultType, category));

    if (effectiveFilter && "musicShelfRenderer" in res) {
      const requestFunc = async (additionalParams: string) =>
        ytmusic.sendRequest(endpoint, body, additionalParams);
      const parseFunc = (contents: JsonList) =>
        parseSearchResults(contents, resultType, category);

      const continuations = await getContinuations(
        res["musicShelfRenderer"],
        "musicShelfContinuation",
        limit - searchResults.length,
        requestFunc,
        parseFunc,
      );
      searchResults.push(...continuations);
    }
  }

  return searchResults;
}

export async function getSearchSuggestions(
  ytmusic: YTMusic,
  query: string,
  detailedRuns = false,
): Promise<string[] | JsonList> {
  const body: JsonDict = { input: query };
  const endpoint = "music/get_search_suggestions";
  const response = await ytmusic.sendRequest(endpoint, body);
  return parseSearchSuggestions(response, detailedRuns);
}
