import type { YTMusic } from "../ytmusic.js";
import { YTMusicError, YTMusicServerError } from "../errors.js";
import type { JsonDict, JsonList } from "../types.js";
import type { LibraryOrder, Rating } from "../models/library.js";
import {
  nav,
  SINGLE_COLUMN_TAB,
  SECTION_LIST,
  MUSIC_SHELF,
  TITLE_TEXT,
  GRID,
  RUN_TEXT,
} from "../navigation.js";
import { getContinuations } from "../continuations.js";
import { parseContentList, parsePlaylist, parseAlbum } from "../parsers/browsing.js";
import {
  getLibraryContents,
  parseLibrarySongs,
  parsePlaylistItems,
  parseLibraryAlbums,
  parseAlbums,
  parseLibraryArtists,
  parseArtists,
} from "../parsers/library.js";
import { getSong } from "./browsing.js";

const VALID_ORDERS: LibraryOrder[] = ["a_to_z", "z_to_a", "recently_added"];
const ORDER_PARAMS: Record<LibraryOrder, string> = {
  a_to_z: "ggMGKgQIARAA",
  z_to_a: "ggMGKgQIARAB",
  recently_added: "ggMGKgQIABAB",
};

function validateOrderParameter(order: LibraryOrder | undefined): void {
  if (order && !VALID_ORDERS.includes(order)) {
    throw new YTMusicError(
      `Invalid order provided. Please use one of the following orders or leave out the parameter: ${VALID_ORDERS.join(", ")}`,
    );
  }
}

function prepareLikeEndpoint(rating: Rating): string {
  switch (rating) {
    case "LIKE":
      return "like/like";
    case "DISLIKE":
      return "like/dislike";
    case "INDIFFERENT":
      return "like/removelike";
    default:
      throw new YTMusicError(`Invalid rating provided. Use one of: LIKE, DISLIKE, INDIFFERENT`);
  }
}

// --- Simple endpoints ---

export async function getAccountInfo(ytmusic: YTMusic): Promise<JsonDict> {
  ytmusic.checkAuth();
  const response = await ytmusic.sendRequest("account/account_menu", {});

  const ACCOUNT_INFO = [
    "actions", 0, "openPopupAction", "popup", "multiPageMenuRenderer",
    "header", "activeAccountHeaderRenderer",
  ] as const;
  const ACCOUNT_RUNS_TEXT = ["runs", 0, "text"] as const;

  const accountName = nav<string>(response, [...ACCOUNT_INFO, "accountName", ...ACCOUNT_RUNS_TEXT]);
  const channelHandle = nav<string>(response, [...ACCOUNT_INFO, "channelHandle", ...ACCOUNT_RUNS_TEXT], true) ?? null;
  const accountPhotoUrl = nav<string>(response, [...ACCOUNT_INFO, "accountPhoto", "thumbnails", 0, "url"]);

  return { accountName, channelHandle, accountPhotoUrl };
}

export async function rateSong(
  ytmusic: YTMusic,
  videoId: string,
  rating: Rating = "INDIFFERENT",
): Promise<JsonDict> {
  ytmusic.checkAuth();
  const body = { target: { videoId } };
  const endpoint = prepareLikeEndpoint(rating);
  return ytmusic.sendRequest(endpoint, body);
}

export async function ratePlaylist(
  ytmusic: YTMusic,
  playlistId: string,
  rating: Rating = "INDIFFERENT",
): Promise<JsonDict> {
  ytmusic.checkAuth();
  const body = { target: { playlistId } };
  const endpoint = prepareLikeEndpoint(rating);
  return ytmusic.sendRequest(endpoint, body);
}

export async function editSongLibraryStatus(
  ytmusic: YTMusic,
  feedbackTokens: string[],
): Promise<JsonDict> {
  ytmusic.checkAuth();
  return ytmusic.sendRequest("feedback", { feedbackTokens });
}

export async function removeHistoryItems(
  ytmusic: YTMusic,
  feedbackTokens: string[],
): Promise<JsonDict> {
  ytmusic.checkAuth();
  return ytmusic.sendRequest("feedback", { feedbackTokens });
}

export async function subscribeArtists(
  ytmusic: YTMusic,
  channelIds: string[],
): Promise<JsonDict> {
  ytmusic.checkAuth();
  return ytmusic.sendRequest("subscription/subscribe", { channelIds });
}

export async function unsubscribeArtists(
  ytmusic: YTMusic,
  channelIds: string[],
): Promise<JsonDict> {
  ytmusic.checkAuth();
  return ytmusic.sendRequest("subscription/unsubscribe", { channelIds });
}

// --- Paginated library endpoints ---

export async function getLibraryPlaylists(
  ytmusic: YTMusic,
  limit: number | null = 25,
): Promise<JsonList> {
  ytmusic.checkAuth();
  const body: JsonDict = { browseId: "FEmusic_liked_playlists" };
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);

  const results = getLibraryContents(response, GRID);
  if (results == null) return [];

  // Skip first item (the "New playlist" button)
  const playlists = parseContentList(results["items"].slice(1), parsePlaylist);

  if ("continuations" in results) {
    const requestFunc = async (additionalParams: string) =>
      ytmusic.sendRequest(endpoint, body, additionalParams);
    const parseFunc = (contents: JsonList) => parseContentList(contents, parsePlaylist);
    const remainingLimit = limit === null ? null : limit - playlists.length;
    const continuations = await getContinuations(
      results, "gridContinuation", remainingLimit, requestFunc, parseFunc,
    );
    playlists.push(...continuations);
  }

  return playlists;
}

export async function getLibrarySongs(
  ytmusic: YTMusic,
  limit: number | null = 25,
  order?: LibraryOrder,
): Promise<JsonList> {
  ytmusic.checkAuth();
  validateOrderParameter(order);
  const body: JsonDict = { browseId: "FEmusic_liked_videos" };
  if (order) {
    body["params"] = ORDER_PARAMS[order];
  }
  const endpoint = "browse";

  const requestFunc = async (additionalParams: string) =>
    ytmusic.sendRequest(endpoint, body, additionalParams);

  const response = await requestFunc("");
  const parsed = parseLibrarySongs(response);
  const results = parsed["results"] as JsonDict | null;
  const songs = parsed["parsed"] as JsonList | null;

  if (!songs) return [];

  if (results && "continuations" in results) {
    const parseFunc = (contents: JsonList) => parsePlaylistItems(contents);
    const remainingLimit = limit === null ? null : limit - songs.length;
    const continuations = await getContinuations(
      results, "musicShelfContinuation", remainingLimit, requestFunc, parseFunc,
    );
    songs.push(...continuations);
  }

  return songs;
}

export async function getLibraryAlbums(
  ytmusic: YTMusic,
  limit: number | null = 25,
  order?: LibraryOrder,
): Promise<JsonList> {
  ytmusic.checkAuth();
  validateOrderParameter(order);
  const body: JsonDict = { browseId: "FEmusic_liked_albums" };
  if (order) {
    body["params"] = ORDER_PARAMS[order];
  }
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);

  const { results, albums } = parseLibraryAlbums(response);
  if (!results) return albums;

  if ("continuations" in results) {
    const requestFunc = async (additionalParams: string) =>
      ytmusic.sendRequest(endpoint, body, additionalParams);
    const parseFunc = (contents: JsonList) => parseAlbums(contents);
    const remainingLimit = limit === null ? null : limit - albums.length;
    const continuations = await getContinuations(
      results, "gridContinuation", remainingLimit, requestFunc, parseFunc,
    );
    albums.push(...continuations);
  }

  return albums;
}

export async function getLibraryArtists(
  ytmusic: YTMusic,
  limit: number | null = 25,
  order?: LibraryOrder,
): Promise<JsonList> {
  ytmusic.checkAuth();
  validateOrderParameter(order);
  const body: JsonDict = { browseId: "FEmusic_library_corpus_track_artists" };
  if (order) {
    body["params"] = ORDER_PARAMS[order];
  }
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);

  const { results, artists } = parseLibraryArtists(response);
  if (!results) return artists;

  if ("continuations" in results) {
    const requestFunc = async (additionalParams: string) =>
      ytmusic.sendRequest(endpoint, body, additionalParams);
    const parseFunc = (contents: JsonList) => parseArtists(contents);
    const remainingLimit = limit === null ? null : limit - artists.length;
    const continuations = await getContinuations(
      results, "musicShelfContinuation", remainingLimit, requestFunc, parseFunc,
    );
    artists.push(...continuations);
  }

  return artists;
}

export async function getLibrarySubscriptions(
  ytmusic: YTMusic,
  limit: number | null = 25,
  order?: LibraryOrder,
): Promise<JsonList> {
  ytmusic.checkAuth();
  validateOrderParameter(order);
  const body: JsonDict = { browseId: "FEmusic_library_corpus_artists" };
  if (order) {
    body["params"] = ORDER_PARAMS[order];
  }
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);

  const { results, artists } = parseLibraryArtists(response);
  if (!results) return artists;

  if ("continuations" in results) {
    const requestFunc = async (additionalParams: string) =>
      ytmusic.sendRequest(endpoint, body, additionalParams);
    const parseFunc = (contents: JsonList) => parseArtists(contents);
    const remainingLimit = limit === null ? null : limit - artists.length;
    const continuations = await getContinuations(
      results, "musicShelfContinuation", remainingLimit, requestFunc, parseFunc,
    );
    artists.push(...continuations);
  }

  return artists;
}

export async function getLibraryPodcasts(
  ytmusic: YTMusic,
  limit: number | null = 25,
  order?: LibraryOrder,
): Promise<JsonList> {
  ytmusic.checkAuth();
  validateOrderParameter(order);
  const body: JsonDict = { browseId: "FEmusic_library_non_music_audio_list" };
  if (order) {
    body["params"] = ORDER_PARAMS[order];
  }
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);

  const results = getLibraryContents(response, GRID);
  if (results == null) return [];

  // Skip first entry ("Add podcast"). parseAlbum handles the shared MTRIR format;
  // a dedicated parsePodcast can be added later if podcast-specific fields are needed.
  const podcasts = parseContentList(results["items"].slice(1), parseAlbum);

  if ("continuations" in results) {
    const requestFunc = async (additionalParams: string) =>
      ytmusic.sendRequest(endpoint, body, additionalParams);
    const parseFunc = (contents: JsonList) => parseContentList(contents, parseAlbum);
    const remainingLimit = limit === null ? null : limit - podcasts.length;
    const continuations = await getContinuations(
      results, "gridContinuation", remainingLimit, requestFunc, parseFunc,
    );
    podcasts.push(...continuations);
  }

  return podcasts;
}

export async function getLibraryChannels(
  ytmusic: YTMusic,
  limit: number | null = 25,
  order?: LibraryOrder,
): Promise<JsonList> {
  ytmusic.checkAuth();
  validateOrderParameter(order);
  const body: JsonDict = { browseId: "FEmusic_library_non_music_audio_channels_list" };
  if (order) {
    body["params"] = ORDER_PARAMS[order];
  }
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);

  const { results, artists } = parseLibraryArtists(response);
  if (!results) return artists;

  if ("continuations" in results) {
    const requestFunc = async (additionalParams: string) =>
      ytmusic.sendRequest(endpoint, body, additionalParams);
    const parseFunc = (contents: JsonList) => parseArtists(contents);
    const remainingLimit = limit === null ? null : limit - artists.length;
    const continuations = await getContinuations(
      results, "musicShelfContinuation", remainingLimit, requestFunc, parseFunc,
    );
    artists.push(...continuations);
  }

  return artists;
}

// --- History ---

export async function getHistory(ytmusic: YTMusic): Promise<JsonList> {
  ytmusic.checkAuth();
  const response = await ytmusic.sendRequest("browse", { browseId: "FEmusic_history" });
  const results = nav<JsonList>(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]);
  const songs: JsonList = [];

  for (const content of results) {
    const data = nav<JsonList>(content, [...MUSIC_SHELF, "contents"], true);
    if (!data) {
      const error = nav<string>(content, ["musicNotifierShelfRenderer", "title", ...RUN_TEXT], true);
      throw new YTMusicServerError(error ?? "Unknown history error", 0);
    }
    const songlist = parsePlaylistItems(data);
    const played = nav<string>(content["musicShelfRenderer"], TITLE_TEXT);
    for (const song of songlist) {
      song["played"] = played;
    }
    songs.push(...songlist);
  }

  return songs;
}

/**
 * Add an item to the user's play history.
 * Accepts either a videoId (will call getSong internally) or a pre-fetched song
 * dictionary from getSong() to avoid an extra network request.
 */
export async function addHistoryItem(
  ytmusic: YTMusic,
  songOrVideoId: string | JsonDict,
): Promise<JsonDict> {
  ytmusic.checkAuth();
  const song = typeof songOrVideoId === "string"
    ? await getSong(ytmusic, songOrVideoId)
    : songOrVideoId;
  const url = song["playbackTracking"]["videostatsPlaybackUrl"]["baseUrl"] as string;

  const CPN_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let cpn = "";
  for (let i = 0; i < 16; i++) {
    cpn += CPN_ALPHABET[Math.floor(Math.random() * 256) & 63];
  }

  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}ver=2&c=WEB_REMIX&cpn=${cpn}`;
  return ytmusic.sendGetRequest(fullUrl);
}

// --- Liked Songs (playlist) ---

export async function getLikedSongs(
  ytmusic: YTMusic,
  limit: number | null = 100,
): Promise<JsonDict> {
  ytmusic.checkAuth();
  const body: JsonDict = { browseId: "VLLM" };
  const endpoint = "browse";
  const response = await ytmusic.sendRequest(endpoint, body);

  // Parse tracks from the musicShelfRenderer
  const results = getLibraryContents(response, MUSIC_SHELF);
  const tracks = results ? parsePlaylistItems(results["contents"]) : [];

  if (results && "continuations" in results) {
    const requestFunc = async (additionalParams: string) =>
      ytmusic.sendRequest(endpoint, body, additionalParams);
    const parseFunc = (contents: JsonList) => parsePlaylistItems(contents);
    const remainingLimit = limit === null ? null : limit - tracks.length;
    const continuations = await getContinuations(
      results, "musicShelfContinuation", remainingLimit, requestFunc, parseFunc,
    );
    tracks.push(...continuations);
  }

  return { id: "LM", tracks };
}
