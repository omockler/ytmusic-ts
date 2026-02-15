import type { Thumbnail, ArtistRef } from "./common.js";

export interface HomeSection {
  title: string;
  contents: Array<Record<string, unknown>>;
}

export interface ArtistFull {
  name: string;
  description: string | null;
  views: string | null;
  channelId: string;
  shuffleId: string | null;
  radioId: string | null;
  subscribers: string | null;
  monthlyListeners: string | null;
  subscribed: boolean;
  thumbnails: Thumbnail[] | null;
  songs: { browseId: string | null; results: Array<Record<string, unknown>> };
  [key: string]: unknown;
}

export interface AlbumFull {
  title: string;
  type: string;
  thumbnails: Thumbnail[];
  description?: string;
  artists: ArtistRef[] | null;
  year?: string;
  trackCount?: number;
  duration: string;
  audioPlaylistId: string | null;
  likeStatus?: string;
  tracks: Array<Record<string, unknown>>;
  other_versions?: Array<Record<string, unknown>>;
  duration_seconds: number;
  isExplicit: boolean;
  [key: string]: unknown;
}

export interface SongFull {
  videoDetails: Record<string, unknown>;
  playabilityStatus: Record<string, unknown>;
  streamingData?: Record<string, unknown>;
  microformat?: Record<string, unknown>;
  playbackTracking?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Lyrics {
  lyrics: string;
  source: string | null;
  hasTimestamps: boolean;
}
