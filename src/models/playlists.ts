import type { Thumbnail, ArtistRef, AlbumRef } from "./common.js";

export type PrivacyStatus = "PUBLIC" | "PRIVATE" | "UNLISTED";

export interface PlaylistItem {
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

export interface Playlist {
  id: string | null;
  privacy: PrivacyStatus;
  title: string;
  thumbnails: Thumbnail[] | null;
  description: string | null;
  author?: { name: string; id: string | null };
  collaborators?: { text: string; avatars: Array<{ url: string }> };
  year?: string;
  views: number | null;
  duration: string | null;
  duration_seconds: number;
  trackCount: number | null;
  owned: boolean;
  tracks: PlaylistItem[];
  suggestions?: PlaylistItem[];
  related?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}
