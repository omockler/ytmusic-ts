import type { YTMusic } from "../ytmusic.js";
import { YTMusicError } from "../errors.js";
import type { JsonDict, JsonList } from "../types.js";
import {
  nav,
  findObjectByKey,
  SINGLE_COLUMN_TAB,
  TWO_COLUMN_RENDERER,
  SECTION,
  SECTION_LIST,
  SECTION_LIST_ITEM,
  MUSIC_SHELF,
  TITLE,
  TITLE_TEXT,
  DESCRIPTION_SHELF,
  DESCRIPTION,
  HEADER_MUSIC_VISUAL,
  HEADER_SIDE,
  MULTI_SELECT,
  SECTION_LIST_CONTINUATION,
  CONTENT,
  CAROUSEL,
  CAROUSEL_CONTENTS,
  GRID,
  GRID_ITEMS,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  THUMBNAILS,
  RUN_TEXT,
} from "../navigation.js";
import { getContinuations, getReloadableContinuationParams } from "../continuations.js";
import {
  parseMixedContent,
  parseContentList,
  parseAlbum,
  parsePlaylist,
  parseVideo,
  parseSingle,
  parseRelatedArtist,
} from "../parsers/browsing.js";
import { parseAlbumHeader2024 } from "../parsers/albums.js";

export async function getHome(ytmusic: YTMusic, limit = 3): Promise<JsonList> {
  const endpoint = "browse";
  const body: JsonDict = { browseId: "FEmusic_home" };
  const response = await ytmusic.sendRequest(endpoint, body);
  const results = nav<JsonList>(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]);
  const home = parseMixedContent(results);

  const sectionList = nav(response, [...SINGLE_COLUMN_TAB, "sectionListRenderer"]);
  if ("continuations" in sectionList) {
    const requestFunc = async (additionalParams: string) =>
      ytmusic.sendRequest(endpoint, body, additionalParams);

    const continuations = await getContinuations(
      sectionList,
      "sectionListContinuation",
      limit - home.length,
      requestFunc,
      parseMixedContent,
    );
    home.push(...continuations);
  }

  return home;
}

export async function getArtist(ytmusic: YTMusic, channelId: string): Promise<JsonDict> {
  let id = channelId;
  if (id.startsWith("MPLA")) {
    id = id.substring(4);
  }
  const body: JsonDict = { browseId: id };
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);
  const results = nav<JsonList>(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]);

  const artist: JsonDict = { description: null, views: null };
  const header = response["header"]["musicImmersiveHeaderRenderer"];
  artist["name"] = nav(header, TITLE_TEXT);
  const descriptionShelf = findObjectByKey(results, DESCRIPTION_SHELF[0], undefined, true);
  if (descriptionShelf) {
    artist["description"] = nav(descriptionShelf, DESCRIPTION);
    artist["views"] =
      "subheader" in descriptionShelf
        ? descriptionShelf["subheader"]["runs"][0]["text"]
        : null;
  }
  const subscriptionButton = header["subscriptionButton"]["subscribeButtonRenderer"];
  artist["channelId"] = subscriptionButton["channelId"];
  artist["shuffleId"] = nav(header, ["playButton", "buttonRenderer", ...NAVIGATION_PLAYLIST_ID], true) ?? null;
  artist["radioId"] = nav(header, ["startRadioButton", "buttonRenderer", ...NAVIGATION_PLAYLIST_ID], true) ?? null;
  artist["subscribers"] = nav(subscriptionButton, ["subscriberCountText", "runs", 0, "text"], true) ?? null;
  artist["monthlyListeners"] = nav(header, ["monthlyListenerCount", "runs", 0, "text"], true) ?? null;
  if (artist["monthlyListeners"]) {
    artist["monthlyListeners"] = (artist["monthlyListeners"] as string).replace(" monthly audience", "");
  }
  artist["subscribed"] = subscriptionButton["subscribed"];
  artist["thumbnails"] = nav(header, THUMBNAILS, true) ?? null;
  artist["songs"] = { browseId: null, results: [] };

  if ("musicShelfRenderer" in results[0]) {
    const musicShelf = nav(results[0], MUSIC_SHELF);
    if ("navigationEndpoint" in nav(musicShelf, TITLE)) {
      artist["songs"]["browseId"] = nav(musicShelf, [...TITLE, ...NAVIGATION_BROWSE_ID]);
    }
    // Simplified: parse basic song items from shelf contents
    artist["songs"]["results"] = musicShelf["contents"];
  }

  // Parse channel content sections (albums, singles, videos, related)
  const categories = parseChannelContents(results);
  Object.assign(artist, categories);

  return artist;
}

function parseChannelContents(results: JsonList): JsonDict {
  const categories: JsonDict = {};
  for (const result of results) {
    if ("musicCarouselShelfRenderer" in result) {
      const carousel = result["musicCarouselShelfRenderer"];
      const titleObj = nav(carousel, ["header", "musicCarouselShelfBasicHeaderRenderer", ...TITLE], true);
      if (!titleObj) continue;
      const title = (titleObj["text"] as string).toLowerCase();
      const browseId = nav(titleObj, NAVIGATION_BROWSE_ID, true) ?? null;
      const contents = carousel["contents"] as JsonList;

      let key: string;
      let parsedContents: JsonList;

      if (title.includes("song")) {
        key = "songs";
        // Songs in carousel are typically MRLIR format
        parsedContents = contents;
      } else if (title.includes("video")) {
        key = "videos";
        parsedContents = parseContentList(contents, parseVideo);
      } else if (title.includes("album")) {
        key = "albums";
        parsedContents = parseContentList(contents, parseAlbum);
      } else if (title.includes("single")) {
        key = "singles";
        parsedContents = parseContentList(contents, parseSingle);
      } else if (title.includes("related") || title.includes("fans")) {
        key = "related";
        parsedContents = parseContentList(contents, parseRelatedArtist);
      } else {
        key = title.replace(/\s+/g, "_");
        parsedContents = contents;
      }

      const params = nav(
        carousel,
        [
          "header",
          "musicCarouselShelfBasicHeaderRenderer",
          ...TITLE,
          "navigationEndpoint",
          "browseEndpoint",
          "params",
        ],
        true,
      );

      categories[key] = {
        browseId,
        results: parsedContents,
        ...(params ? { params } : {}),
      };
    }
  }
  return categories;
}

export async function getArtistAlbums(
  ytmusic: YTMusic,
  channelId: string,
  params: string,
  limit: number | null = 100,
  order?: string,
): Promise<JsonList> {
  const body: JsonDict = { browseId: channelId, params };
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);

  const requestFunc = async (additionalParams: string) =>
    ytmusic.sendRequest(endpoint, body, additionalParams);
  const parseFunc = (contents: JsonList) => parseContentList(contents, parseAlbum);

  let results: JsonDict;
  if (order) {
    const sortOptions = nav<JsonList>(
      response,
      [
        ...SINGLE_COLUMN_TAB,
        ...SECTION,
        ...HEADER_SIDE,
        "endItems",
        0,
        "musicSortFilterButtonRenderer",
        "menu",
        "musicMultiSelectMenuRenderer",
        "options",
      ],
    );

    let continuation: JsonDict | null = null;
    for (const option of sortOptions) {
      if (nav<string>(option, [...MULTI_SELECT, ...TITLE_TEXT]).toLowerCase() === order.toLowerCase()) {
        const commands = nav<JsonList>(option, [
          ...MULTI_SELECT,
          "selectedCommand",
          "commandExecutorCommand",
          "commands",
        ]);
        continuation = nav(commands[commands.length - 1], [
          "browseSectionListReloadEndpoint",
        ]);
        break;
      }
    }

    if (continuation) {
      const additionalParams = getReloadableContinuationParams({
        continuations: [continuation["continuation"]],
      });
      const sortedResponse = await requestFunc(additionalParams);
      results = nav(sortedResponse, [...SECTION_LIST_CONTINUATION, ...CONTENT]);
    } else {
      throw new YTMusicError(`Invalid order parameter ${order}`);
    }
  } else {
    results = nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM]);
  }

  const contents = nav<JsonList>(results, GRID_ITEMS, true) ?? nav<JsonList>(results, CAROUSEL_CONTENTS);
  const albums = parseContentList(contents, parseAlbum);

  const gridResults = nav(results, GRID, true);
  if (gridResults && "continuations" in gridResults) {
    const remainingLimit = limit === null ? null : limit - albums.length;
    const continuations = await getContinuations(
      gridResults,
      "gridContinuation",
      remainingLimit,
      requestFunc,
      parseFunc,
    );
    albums.push(...continuations);
  }

  return albums;
}

export async function getUser(ytmusic: YTMusic, channelId: string): Promise<JsonDict> {
  const endpoint = "browse";
  const body: JsonDict = { browseId: channelId };
  const response = await ytmusic.sendRequest(endpoint, body);
  const user: JsonDict = { name: nav(response, [...HEADER_MUSIC_VISUAL, ...TITLE_TEXT]) };
  const results = nav<JsonList>(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]);
  Object.assign(user, parseChannelContents(results));
  return user;
}

export async function getUserPlaylists(
  ytmusic: YTMusic,
  channelId: string,
  params: string,
): Promise<JsonList> {
  const endpoint = "browse";
  const body: JsonDict = { browseId: channelId, params };
  const response = await ytmusic.sendRequest(endpoint, body);
  const results = nav<JsonList>(
    response,
    [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM, ...GRID_ITEMS],
    true,
  );
  if (!results) return [];
  return parseContentList(results, parsePlaylist);
}

export async function getAlbum(ytmusic: YTMusic, browseId: string): Promise<JsonDict> {
  if (!browseId || !browseId.startsWith("MPRE")) {
    throw new YTMusicError("Invalid album browseId provided, must start with MPRE.");
  }

  const body: JsonDict = { browseId };
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);
  const album: JsonDict = parseAlbumHeader2024(response);

  const musicShelf = nav(response, [
    ...TWO_COLUMN_RENDERER,
    "secondaryContents",
    ...SECTION_LIST_ITEM,
    ...MUSIC_SHELF,
  ]);
  album["tracks"] = musicShelf["contents"];

  const secondaryCarousels =
    nav<JsonList>(response, [...TWO_COLUMN_RENDERER, "secondaryContents", ...SECTION_LIST], true) ?? [];

  for (const section of secondaryCarousels.slice(1)) {
    const carousel = nav(section, CAROUSEL);
    const itemSize = carousel["itemSize"];
    const key =
      itemSize === "COLLECTION_STYLE_ITEM_SIZE_SMALL"
        ? "related_recommendations"
        : "other_versions";
    album[key] = parseContentList(carousel["contents"], parseAlbum);
  }

  // Sum total duration
  let totalDuration = 0;
  for (const track of album["tracks"]) {
    if (track["duration_seconds"]) {
      totalDuration += track["duration_seconds"];
    }
  }
  album["duration_seconds"] = totalDuration;

  for (let i = 0; i < album["tracks"].length; i++) {
    album["tracks"][i]["album"] = album["title"];
    album["tracks"][i]["artists"] = album["tracks"][i]["artists"] || album["artists"];
  }

  return album;
}

export async function getSong(
  ytmusic: YTMusic,
  videoId: string,
  signatureTimestamp?: number,
): Promise<JsonDict> {
  const endpoint = "player";
  const sigTimestamp = signatureTimestamp ?? getDatestamp() - 1;

  const params: JsonDict = {
    playbackContext: { contentPlaybackContext: { signatureTimestamp: sigTimestamp } },
    video_id: videoId,
  };
  const response = await ytmusic.sendRequest(endpoint, params);
  const keys = ["videoDetails", "playabilityStatus", "streamingData", "microformat", "playbackTracking"];
  for (const k of Object.keys(response)) {
    if (!keys.includes(k)) {
      delete response[k];
    }
  }
  return response;
}

function getDatestamp(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export async function getSongRelated(ytmusic: YTMusic, browseId: string): Promise<JsonList> {
  if (!browseId) {
    throw new YTMusicError("Invalid browseId provided.");
  }
  const response = await ytmusic.sendRequest("browse", { browseId });
  const sections = nav<JsonList>(response, ["contents", ...SECTION_LIST]);
  return parseMixedContent(sections);
}

export async function getLyrics(ytmusic: YTMusic, browseId: string): Promise<JsonDict | null> {
  if (!browseId) {
    throw new YTMusicError("Invalid browseId provided. This song might not have lyrics.");
  }

  const response = await ytmusic.sendRequest("browse", { browseId });

  const lyricsStr = nav<string>(
    response,
    ["contents", ...SECTION_LIST_ITEM, ...DESCRIPTION_SHELF, ...DESCRIPTION],
    true,
  );

  if (lyricsStr == null) {
    return null;
  }

  return {
    lyrics: lyricsStr,
    source: nav(response, ["contents", ...SECTION_LIST_ITEM, ...DESCRIPTION_SHELF, ...RUN_TEXT], true) ?? null,
    hasTimestamps: false,
  };
}
