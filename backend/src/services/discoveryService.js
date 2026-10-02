import { Artist } from '../models/index.js';
import { buildUserTasteProfile } from './recommendationService.js';
import { fetchSimilarArtists } from './genreService.js';
import { searchVideo } from './youtubeService.js';

const TOP_ARTISTS_TO_EXPLORE = 8;
const SIMILAR_PER_ARTIST = 10;
const CANDIDATE_POOL_SIZE = 30;
const NEW_ARTISTS_TO_SEARCH = 20;
const SONGS_PER_NEW_ARTIST = 1;
const SEARCH_CONCURRENCY = 4;

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function weightedSample(items, count, rng) {
  const pool = items.map((item) => ({ item, key: Math.pow(rng(), 1 / Math.max(item.score, 0.01)) }));
  pool.sort((a, b) => b.key - a.key);
  return pool.slice(0, count).map((p) => p.item);
}

export async function discoverNewMusicForUser(userId) {
  const today = dayKey();
  const cacheKey = `${userId}:${today}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`) && key !== cacheKey) cache.delete(key);
  }

  const profile = await buildUserTasteProfile(userId);
  if (profile.topArtistIds.length === 0) {
    return []; // nothing to base discovery on yet
  }

  const topArtists = await Artist.findAll({
    where: { id: profile.topArtistIds.slice(0, TOP_ARTISTS_TO_EXPLORE) },
  });

  const knownArtistNames = new Set(
    (await Artist.findAll({ attributes: ['name'] })).map((a) => normalizeName(a.name)),
  );

  const candidateScore = new Map(); // normalized name -> { name, score }
  for (const artist of topArtists)
  {
    const similar = await fetchSimilarArtists(artist.name, SIMILAR_PER_ARTIST);
    for (const s of similar) {
      const key = normalizeName(s.name);
      if (knownArtistNames.has(key)) continue;
      const existing = candidateScore.get(key);
      if (!existing || s.match > existing.score) {
        candidateScore.set(key, { name: s.name, score: s.match });
      }
    }
  }

  const rankedCandidates = [...candidateScore.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, CANDIDATE_POOL_SIZE);

  if (rankedCandidates.length === 0) {
    cache.set(cacheKey, []);
    return [];
  }

  const rng = seededRandom(`${userId}:${today}`);
  const newArtists = weightedSample(
    rankedCandidates,
    Math.min(NEW_ARTISTS_TO_SEARCH, rankedCandidates.length),
    rng,
  );

  const songsByArtist = new Array(newArtists.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < newArtists.length) {
      const i = cursor++;
      const artist = newArtists[i];
      try {
        const results = await searchVideo(artist.name, SONGS_PER_NEW_ARTIST + 1);
        songsByArtist[i] = results
          .slice(0, SONGS_PER_NEW_ARTIST)
          .map((song) => ({ ...song, discoveredArtist: artist.name }));
      }
      catch (err) {
        console.warn(`[discoveryService] search failed for "${artist.name}":`, err.message);
        songsByArtist[i] = [];
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(SEARCH_CONCURRENCY, newArtists.length) }, worker),
  );

  const songs = songsByArtist.flat();
  cache.set(cacheKey, songs);
  return songs;
}

function normalizeName(name) {
  return (name ?? '').trim().toLowerCase();
}
