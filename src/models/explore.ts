import type { Thumbnail } from "./common.js";

export interface MoodCategory {
  title: string;
  params: string;
}

export interface ChartSong {
  title: string;
  videoId: string | null;
  videoType: string | null;
  playlistId: string;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  artists?: Array<{ name: string; id: string | null }>;
  album?: { name: string; id: string | null };
  rank: string | null;
  trend: string | null;
  [key: string]: unknown;
}

export interface ChartArtist {
  title: string;
  browseId: string;
  subscribers: string | null;
  thumbnails: Thumbnail[];
  rank: string | null;
  trend: string | null;
}
