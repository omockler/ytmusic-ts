import {
  YTM_BASE_API,
  YTM_PARAMS,
  YTM_PARAMS_KEY,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LOCATIONS,
} from "./constants.js";
import type { SupportedLanguage, SupportedLocation } from "./constants.js";
import { YTMusicError } from "./errors.js";
import { initializeContext, initializeHeaders } from "./helpers.js";
import { HttpClient } from "./http/client.js";
import type { HttpClientConfig } from "./http/client.js";
import { createHeaderProvider } from "./auth/headers.js";
import { AuthType } from "./auth/types.js";
import type { AuthConfig } from "./auth/types.js";
import type { JsonDict, JsonList } from "./types.js";
import type { LibraryOrder, Rating } from "./models/library.js";
import type { PrivacyStatus } from "./models/playlists.js";

// Mixin imports
import * as searchMixin from "./mixins/search.js";
import * as browsingMixin from "./mixins/browsing.js";
import * as watchMixin from "./mixins/watch.js";
import * as exploreMixin from "./mixins/explore.js";
import * as libraryMixin from "./mixins/library.js";
import * as playlistMixin from "./mixins/playlists.js";

export interface YTMusicConfig {
  auth?: AuthConfig;
  language?: SupportedLanguage;
  location?: SupportedLocation;
  user?: string;
  http?: HttpClientConfig;
}

export class YTMusic {
  readonly context: JsonDict;
  readonly language: string;
  readonly auth: AuthConfig;
  private readonly httpClient: HttpClient;
  private readonly params: string;
  private readonly cookies: Record<string, string> = { SOCS: "CAI" };

  constructor(config: YTMusicConfig = {}) {
    const { auth, language, location, user, http } = config;

    // Validate language
    const lang = language ?? "en";
    if (!SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      throw new YTMusicError(
        `Language not supported. Supported languages are ${SUPPORTED_LANGUAGES.join(", ")}.`,
      );
    }

    // Validate location
    if (location && !SUPPORTED_LOCATIONS.includes(location as SupportedLocation)) {
      throw new YTMusicError("Location not supported. Check the FAQ for supported locations.");
    }

    this.language = lang;
    this.auth = auth ?? { type: AuthType.UNAUTHORIZED };
    this.context = initializeContext(lang, location);

    if (user) {
      this.context.context.user.onBehalfOfUser = user;
    }

    // Set params based on auth type
    this.params = this.auth.type === AuthType.BROWSER
      ? YTM_PARAMS + YTM_PARAMS_KEY
      : YTM_PARAMS;

    // Build header provider and HTTP client
    const baseHeaders = initializeHeaders();
    const headerProvider = createHeaderProvider(this.auth, baseHeaders);

    this.httpClient = new HttpClient({
      ...http,
      headerProvider,
    });
  }

  /** Send a POST request to the YTMusic API. */
  async sendRequest(endpoint: string, body: JsonDict, additionalParams = ""): Promise<JsonDict> {
    const mergedBody = { ...body, ...this.context };
    const url = YTM_BASE_API + endpoint + this.params + additionalParams;
    return this.httpClient.post(url, mergedBody);
  }

  /** Send a GET request. */
  async sendGetRequest(url: string): Promise<JsonDict> {
    return this.httpClient.get(url);
  }

  /** Throws if the client is not authenticated. */
  checkAuth(): void {
    if (this.auth.type === AuthType.UNAUTHORIZED) {
      throw new YTMusicError("Please provide authentication before using this function");
    }
  }

  // --- Search ---

  /** Search YouTube Music. Returns results within the provided category. */
  search(
    query: string,
    filter?: string | null,
    scope?: string | null,
    limit = 20,
    ignoreSpelling = false,
  ): Promise<JsonList> {
    return searchMixin.search(this, query, filter, scope, limit, ignoreSpelling);
  }

  /** Get search suggestions for a query. */
  getSearchSuggestions(query: string, detailedRuns = false): Promise<string[] | JsonList> {
    return searchMixin.getSearchSuggestions(this, query, detailedRuns);
  }

  // --- Browsing ---

  /** Get the home page. */
  getHome(limit = 3): Promise<JsonList> {
    return browsingMixin.getHome(this, limit);
  }

  /** Get information about an artist and their top releases. */
  getArtist(channelId: string): Promise<JsonDict> {
    return browsingMixin.getArtist(this, channelId);
  }

  /** Get the full list of an artist's albums, singles or shows. */
  getArtistAlbums(
    channelId: string,
    params: string,
    limit: number | null = 100,
    order?: string,
  ): Promise<JsonList> {
    return browsingMixin.getArtistAlbums(this, channelId, params, limit, order);
  }

  /** Get information and tracks of an album. */
  getAlbum(browseId: string): Promise<JsonDict> {
    return browsingMixin.getAlbum(this, browseId);
  }

  /** Returns metadata and streaming information about a song or video. */
  getSong(videoId: string, signatureTimestamp?: number): Promise<JsonDict> {
    return browsingMixin.getSong(this, videoId, signatureTimestamp);
  }

  /** Gets related content for a song. */
  getSongRelated(browseId: string): Promise<JsonList> {
    return browsingMixin.getSongRelated(this, browseId);
  }

  /** Returns lyrics of a song or video. */
  getLyrics(browseId: string): Promise<JsonDict | null> {
    return browsingMixin.getLyrics(this, browseId);
  }

  /** Retrieve a user's page. */
  getUser(channelId: string): Promise<JsonDict> {
    return browsingMixin.getUser(this, channelId);
  }

  /** Retrieve a list of playlists for a given user. */
  getUserPlaylists(channelId: string, params: string): Promise<JsonList> {
    return browsingMixin.getUserPlaylists(this, channelId, params);
  }

  // --- Watch ---

  /** Get a watch playlist for a song or video. */
  getWatchPlaylist(
    videoId?: string,
    playlistId?: string,
    limit = 25,
    radio = false,
    shuffle = false,
  ): Promise<JsonDict> {
    return watchMixin.getWatchPlaylist(this, videoId, playlistId, limit, radio, shuffle);
  }

  // --- Explore ---

  /** Fetch "Moods & Genres" categories from YouTube Music. */
  getMoodCategories(): Promise<JsonDict> {
    return exploreMixin.getMoodCategories(this);
  }

  /** Retrieve a list of playlists for a given "Moods & Genres" category. */
  getMoodPlaylists(params: string): Promise<JsonList> {
    return exploreMixin.getMoodPlaylists(this, params);
  }

  /** Get latest explore data from YouTube Music. */
  getExplore(): Promise<JsonDict> {
    return exploreMixin.getExplore(this);
  }

  // --- Library ---

  /** Get information about the authenticated user's account. */
  getAccountInfo(): Promise<JsonDict> {
    return libraryMixin.getAccountInfo(this);
  }

  /** Get playlists in the user's library. */
  getLibraryPlaylists(limit: number | null = 25): Promise<JsonList> {
    return libraryMixin.getLibraryPlaylists(this, limit);
  }

  /** Get songs in the user's library. */
  getLibrarySongs(limit: number | null = 25, order?: LibraryOrder): Promise<JsonList> {
    return libraryMixin.getLibrarySongs(this, limit, order);
  }

  /** Get albums in the user's library. */
  getLibraryAlbums(limit: number | null = 25, order?: LibraryOrder): Promise<JsonList> {
    return libraryMixin.getLibraryAlbums(this, limit, order);
  }

  /** Get artists of songs in the user's library. */
  getLibraryArtists(limit: number | null = 25, order?: LibraryOrder): Promise<JsonList> {
    return libraryMixin.getLibraryArtists(this, limit, order);
  }

  /** Get artists the user has subscribed to. */
  getLibrarySubscriptions(limit: number | null = 25, order?: LibraryOrder): Promise<JsonList> {
    return libraryMixin.getLibrarySubscriptions(this, limit, order);
  }

  /** Get podcasts in the user's library. */
  getLibraryPodcasts(limit: number | null = 25, order?: LibraryOrder): Promise<JsonList> {
    return libraryMixin.getLibraryPodcasts(this, limit, order);
  }

  /** Get channels in the user's library. */
  getLibraryChannels(limit: number | null = 25, order?: LibraryOrder): Promise<JsonList> {
    return libraryMixin.getLibraryChannels(this, limit, order);
  }

  /** Get the user's play history. */
  getHistory(): Promise<JsonList> {
    return libraryMixin.getHistory(this);
  }

  /** Add an item to the user's play history. Accepts videoId or pre-fetched song dict. */
  addHistoryItem(songOrVideoId: string | JsonDict): Promise<JsonDict> {
    return libraryMixin.addHistoryItem(this, songOrVideoId);
  }

  /** Get liked songs. */
  getLikedSongs(limit: number | null = 100): Promise<JsonDict> {
    return libraryMixin.getLikedSongs(this, limit);
  }

  /** Rate a song (like/dislike/remove rating). */
  rateSong(videoId: string, rating: Rating = "INDIFFERENT"): Promise<JsonDict> {
    return libraryMixin.rateSong(this, videoId, rating);
  }

  /** Rate a playlist (add to/remove from library). */
  ratePlaylist(playlistId: string, rating: Rating = "INDIFFERENT"): Promise<JsonDict> {
    return libraryMixin.ratePlaylist(this, playlistId, rating);
  }

  /** Add or remove songs from library using feedback tokens. */
  editSongLibraryStatus(feedbackTokens: string[]): Promise<JsonDict> {
    return libraryMixin.editSongLibraryStatus(this, feedbackTokens);
  }

  /** Remove items from play history using feedback tokens. */
  removeHistoryItems(feedbackTokens: string[]): Promise<JsonDict> {
    return libraryMixin.removeHistoryItems(this, feedbackTokens);
  }

  /** Subscribe to artists. */
  subscribeArtists(channelIds: string[]): Promise<JsonDict> {
    return libraryMixin.subscribeArtists(this, channelIds);
  }

  /** Unsubscribe from artists. */
  unsubscribeArtists(channelIds: string[]): Promise<JsonDict> {
    return libraryMixin.unsubscribeArtists(this, channelIds);
  }

  // --- Playlists ---

  /** Get playlist contents. */
  getPlaylist(
    playlistId: string,
    limit: number | null = 100,
    related = false,
    suggestionsLimit = 0,
  ): Promise<JsonDict> {
    return playlistMixin.getPlaylist(this, playlistId, limit, related, suggestionsLimit);
  }

  /** Create a new playlist. */
  createPlaylist(
    title: string,
    description: string,
    privacyStatus: PrivacyStatus = "PRIVATE",
    videoIds?: string[],
    sourcePlaylist?: string,
  ): Promise<string | JsonDict> {
    return playlistMixin.createPlaylist(this, title, description, privacyStatus, videoIds, sourcePlaylist);
  }

  /** Edit a playlist's metadata. */
  editPlaylist(
    playlistId: string,
    title?: string,
    description?: string,
    privacyStatus?: PrivacyStatus,
    moveItem?: string | [string, string],
    addPlaylistId?: string,
    addToTop?: boolean,
  ): Promise<string | JsonDict> {
    return playlistMixin.editPlaylist(
      this, playlistId, title, description, privacyStatus, moveItem, addPlaylistId, addToTop,
    );
  }

  /** Delete a playlist. */
  deletePlaylist(playlistId: string): Promise<string | JsonDict> {
    return playlistMixin.deletePlaylist(this, playlistId);
  }

  /** Add items to a playlist. */
  addPlaylistItems(
    playlistId: string,
    videoIds?: string[],
    sourcePlaylist?: string,
    duplicates = false,
  ): Promise<JsonDict> {
    return playlistMixin.addPlaylistItems(this, playlistId, videoIds, sourcePlaylist, duplicates);
  }

  /** Remove items from a playlist. */
  removePlaylistItems(playlistId: string, videos: JsonList): Promise<string | JsonDict> {
    return playlistMixin.removePlaylistItems(this, playlistId, videos);
  }
}
