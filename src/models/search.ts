import type { Thumbnail } from "./common.js";

export interface SearchOptions {
  filter?: string;
  scope?: string;
  limit?: number;
  ignoreSpelling?: boolean;
}

export interface SearchResult {
  category?: string | null;
  resultType: string | null;
  title?: string;
  videoId?: string;
  videoType?: string;
  playlistId?: string;
  browseId?: string;
  artists?: Array<{ name: string; id: string | null }>;
  artist?: string;
  album?: { name: string; id: string | null } | null;
  duration?: string | null;
  duration_seconds?: number | null;
  year?: string | null;
  views?: string;
  subscribers?: string;
  thumbnails?: Thumbnail[];
  isExplicit?: boolean;
  author?: string | Array<{ name: string; id: string | null }> | null;
  itemCount?: string | number;
  name?: string;
  [key: string]: unknown;
}

export interface SearchSuggestion {
  text: string;
  runs: Array<{ text: string; bold?: boolean }>;
  fromHistory: boolean;
  feedbackToken: string | null;
}
