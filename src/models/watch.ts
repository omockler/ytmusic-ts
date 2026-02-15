import type { Thumbnail } from "./common.js";

export interface WatchTrack {
  videoId: string;
  title: string;
  length: string | null;
  thumbnail: Thumbnail[];
  likeStatus: string | null;
  videoType: string | null;
  artists?: Array<{ name: string; id: string | null }>;
  album?: { name: string; id: string | null } | null;
  views?: string;
  duration?: string;
  duration_seconds?: number;
  year?: string;
  inLibrary: boolean | null;
  feedbackTokens: { add: string | null; remove: string | null } | null;
  pinnedToListenAgain: boolean | null;
  listenAgainFeedbackTokens: { pin: string | null; unpin: string | null } | null;
  counterpart?: WatchTrack;
  [key: string]: unknown;
}

export interface WatchPlaylist {
  tracks: WatchTrack[];
  playlistId?: string | null;
  lyrics?: string | null;
  related?: string | null;
  [key: string]: unknown;
}
