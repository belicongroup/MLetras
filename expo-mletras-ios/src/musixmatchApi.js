// Musixmatch API helper tailored for Expo / React Native.
// Requests are funneled through the Cloudflare Smart Proxy so the API key
// remains server-side and KV caching handles rate limiting.

const MUSIXMATCH_BASE_URL = 'https://mletras-smart-proxy.belicongroup.workers.dev';

const MIN_REQUEST_INTERVAL = 300; // throttle to avoid hammering proxy
let lastRequestTime = 0;

const throttleFetch = async (endpoint, params = {}) => {
  const now = Date.now();
  const sinceLast = now - lastRequestTime;
  if (sinceLast < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - sinceLast));
  }
  lastRequestTime = Date.now();

  const url = new URL(`${MUSIXMATCH_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Musixmatch request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.message || data.message.header.status_code !== 200) {
    throw new Error(`Musixmatch API error: ${data?.message?.header?.status_code || 'unknown'}`);
  }

  return data;
};

export const searchSongs = async (query, pageSize = 10, page = 1) => {
  const simpleQuery = (query || '').trim();
  if (!simpleQuery) return [];

  try {
    const data = await throttleFetch('track.search', {
      q: simpleQuery,
      page_size: String(pageSize),
      page: String(page),
      f_has_lyrics: '1',
    });

    const trackList = data?.message?.body?.track_list || [];
    return trackList.map(({ track }) => ({
      id: String(track.track_id),
      title: track.track_name,
      artist: track.artist_name,
      album: track.album_name,
      imageUrl: track.album_coverart_500x500 || track.album_coverart_350x350 || track.album_coverart_100x100,
      url: track.track_share_url,
      trackLength: track.track_length,
      hasLyrics: track.has_lyrics === 1,
    }));
  } catch (error) {
    if (__DEV__) {
      console.warn('Musixmatch search error', error);
    }
    return [];
  }
};

export const getSongLyrics = async (trackId) => {
  if (!trackId) return 'Lyrics not available for this song.';

  try {
    const data = await throttleFetch('track.lyrics.get', {
      track_id: String(trackId),
    });

    const lyrics = data?.message?.body?.lyrics?.lyrics_body || '';
    if (
      lyrics.includes('******* This Lyrics is NOT for Commercial use *******') ||
      !lyrics.trim()
    ) {
      return 'Lyrics not available for this song.';
    }

    return lyrics;
  } catch (error) {
    if (__DEV__) {
      console.warn('Musixmatch lyrics error', error);
    }
    return 'Error fetching lyrics. Please try again.';
  }
};

export const searchByArtist = async (artistName, pageSize = 5) => {
  const name = (artistName || '').trim();
  if (!name) return [];

  try {
    const data = await throttleFetch('track.search', {
      q_artist: name,
      page_size: String(pageSize),
      s_track_rating: 'desc',
      f_has_lyrics: '1',
    });

    const trackList = data?.message?.body?.track_list || [];
    return trackList.map(({ track }) => ({
      id: String(track.track_id),
      title: track.track_name,
      artist: track.artist_name,
      album: track.album_name,
      imageUrl: track.album_coverart_500x500 || track.album_coverart_350x350 || track.album_coverart_100x100,
      url: track.track_share_url,
      trackLength: track.track_length,
      hasLyrics: track.has_lyrics === 1,
    }));
  } catch (error) {
    if (__DEV__) {
      console.warn('Musixmatch artist search error', error);
    }
    return [];
  }
};

export default {
  searchSongs,
  getSongLyrics,
  searchByArtist,
};

