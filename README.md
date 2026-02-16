# ytmusic-ts

[![npm version](https://img.shields.io/npm/v/ytmusic-ts)](https://www.npmjs.com/package/ytmusic-ts)

TypeScript port of [ytmusicapi](https://github.com/sigma67/ytmusicapi) — interact with the YouTube Music API.

## Installation

```bash
yarn add ytmusic-ts
```

## API Coverage

Feature support compared to the upstream Python [ytmusicapi](https://github.com/sigma67/ytmusicapi):

### Browsing

| Function | Status |
|---|---|
| `getHome` | Supported |
| `getArtist` | Supported |
| `getArtistAlbums` | Supported |
| `getUser` | Supported |
| `getUserPlaylists` | Supported |
| `getUserVideos` | Supported |
| `getAlbumBrowseId` | Supported |
| `getAlbum` | Supported |
| `getSong` | Supported |
| `getSongRelated` | Supported |
| `getLyrics` | Supported |
| `getBasejsUrl` | Supported |
| `getSignatureTimestamp` | Supported |
| `getTasteprofile` | Supported |
| `setTasteprofile` | Supported |

### Search

| Function | Status |
|---|---|
| `search` | Supported |
| `getSearchSuggestions` | Supported |
| `removeSearchSuggestions` | Not yet |

### Watch

| Function | Status |
|---|---|
| `getWatchPlaylist` | Supported |

### Explore

| Function | Status |
|---|---|
| `getMoodCategories` | Supported |
| `getMoodPlaylists` | Supported |
| `getExplore` | Supported |

### Library

| Function | Status |
|---|---|
| `getLibraryPlaylists` | Supported |
| `getLibrarySongs` | Supported |
| `getLibraryAlbums` | Supported |
| `getLibraryArtists` | Supported |
| `getLibrarySubscriptions` | Supported |
| `getLibraryPodcasts` | Supported |
| `getLibraryChannels` | Supported |
| `getLikedSongs` | Supported |
| `getHistory` | Supported |
| `addHistoryItem` | Supported |
| `removeHistoryItems` | Supported |
| `rateSong` | Supported |
| `editSongLibraryStatus` | Supported |
| `ratePlaylist` | Supported |
| `subscribeArtists` | Supported |
| `unsubscribeArtists` | Supported |
| `getAccountInfo` | Supported |

### Playlists

| Function | Status |
|---|---|
| `getPlaylist` | Supported |
| `createPlaylist` | Supported |
| `editPlaylist` | Supported |
| `deletePlaylist` | Supported |
| `addPlaylistItems` | Supported |
| `removePlaylistItems` | Supported |
| `getSavedEpisodes` | Not yet |

### Uploads

Not yet ported. Includes: `getLibraryUploadSongs`, `getLibraryUploadAlbums`, `getLibraryUploadArtists`, `getLibraryUploadArtist`, `getLibraryUploadAlbum`, `uploadSong`, `deleteUploadEntity`.

### Podcasts

Not yet ported. Includes: `getChannel`, `getChannelEpisodes`, `getPodcast`, `getEpisode`, `getEpisodesPlaylist`.

### Charts

| Function | Status |
|---|---|
| `getCharts` | Supported |

## License

MIT
