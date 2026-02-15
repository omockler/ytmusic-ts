export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface ArtistRef {
  name: string;
  id: string | null;
}

export interface AlbumRef {
  name: string;
  id: string | null;
}
