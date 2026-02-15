import type { Thumbnail, ArtistRef, AlbumRef } from "./common.js";

export type LibraryOrder = "a_to_z" | "z_to_a" | "recently_added";

export type Rating = "LIKE" | "DISLIKE" | "INDIFFERENT";

export interface LibrarySong {
  videoId: string | null;
  title: string | null;
  artists: ArtistRef[] | null;
  album: AlbumRef | null;
  likeStatus: string | null;
  inLibrary: boolean | null;
  thumbnails: Thumbnail[] | null;
  isAvailable: boolean;
  isExplicit: boolean;
  videoType: string | null;
  duration?: string;
  duration_seconds?: number;
  setVideoId?: string;
  feedbackTokens?: { add: string | null; remove: string | null };
  [key: string]: unknown;
}

export interface LibraryAlbum {
  browseId: string;
  playlistId?: string | null;
  title: string;
  type?: string;
  thumbnails: Thumbnail[];
  artists?: ArtistRef[];
  year?: string;
  [key: string]: unknown;
}

export interface LibraryArtist {
  browseId: string;
  artist: string;
  subscribers?: string;
  thumbnails: Thumbnail[] | null;
  type?: string;
  [key: string]: unknown;
}

export interface LibraryPlaylist {
  playlistId: string;
  title: string | null;
  thumbnails: Thumbnail[];
  description?: string;
  count?: string;
  author?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface AccountInfo {
  accountName: string;
  channelHandle: string | null;
  accountPhotoUrl: string;
}
