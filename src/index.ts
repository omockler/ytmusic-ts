export { YTMusic, type YTMusicConfig } from "./ytmusic.js";
export {
  YTMusicError,
  YTMusicAuthError,
  YTMusicNetworkError,
  YTMusicServerError,
  YTMusicParseError,
} from "./errors.js";
export { AuthType, type AuthConfig } from "./auth/types.js";
export { type TokenStorage } from "./auth/storage.js";
export { OAuthCredentials } from "./auth/oauth/credentials.js";
export { OAuthToken } from "./auth/oauth/token.js";
export { nav, findObjectByKey, findObjectsByKey } from "./navigation.js";
export type { JsonDict, JsonList } from "./types.js";

// Model types
export type { Thumbnail, ArtistRef, AlbumRef } from "./models/common.js";
export type { SearchOptions, SearchResult, SearchSuggestion } from "./models/search.js";
export type { HomeSection, ArtistFull, AlbumFull, SongFull, Lyrics } from "./models/browsing.js";
export type { WatchTrack, WatchPlaylist } from "./models/watch.js";
export type { MoodCategory, ChartSong, ChartArtist } from "./models/explore.js";
export type { LibrarySong, LibraryAlbum, LibraryArtist, LibraryPlaylist, LibraryOrder, Rating, AccountInfo } from "./models/library.js";
export type { PrivacyStatus, PlaylistItem, Playlist } from "./models/playlists.js";
