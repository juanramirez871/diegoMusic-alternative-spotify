import fetch from 'node-fetch';
import { Op } from 'sequelize';
import { Song, Artist } from '../models/index.js';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';
const NOISE_TAGS = new Set([
  'seen live', 'favorites', 'favourite', 'favorite', 'awesome', 'love',
  'beautiful', 'amazing', 'good', 'great', 'cool', 'nice', 'my music',
  'to check out', 'checkout', 'spotify', 'youtube', 'sexy', 'catchy',
]);

const MAX_ATTEMPTS = 5;
const MIN_WEIGHT = 20;

function normalizeTag(tag) {
  return tag.trim().toLowerCase();
}

function isUsefulTag(tag) {
  if (!tag || tag.length < 2 || tag.length > 40) return false;
  if (NOISE_TAGS.has(tag)) return false;
  if (/^\d+$/.test(tag)) return false; // bare years etc.
  return true;
}

async function lastfmGet(method, params) {
  if (!LASTFM_API_KEY) return null;
  const url = new URL(LASTFM_BASE);
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', LASTFM_API_KEY);
  url.searchParams.set('format', 'json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url.toString(), { timeout: 8000 });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data;
  }
  catch (err) {
    console.warn(`[genreService] Last.fm request failed (${method}):`, err.message);
    return null;
  }
}

async function fetchTrackTags(artistName, trackTitle) {
  const data = await lastfmGet('track.getTopTags', {
    artist: artistName,
    track: trackTitle,
  });
  const tags = data?.toptags?.tag;
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => normalizeTag(t.name))
    .filter(isUsefulTag)
    .slice(0, 8);
}

async function fetchArtistTags(artistName) {
  const data = await lastfmGet('artist.getTopTags', { artist: artistName });
  const tags = data?.toptags?.tag;
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t) => Number(t.count) >= MIN_WEIGHT || tags.indexOf(t) < 5)
    .map((t) => normalizeTag(t.name))
    .filter(isUsefulTag)
    .slice(0, 8);
}

export async function fetchSimilarArtists(artistName, limit = 10) {
  const data = await lastfmGet('artist.getSimilar', { artist: artistName, limit });
  const artists = data?.similarartists?.artist;
  if (!Array.isArray(artists)) return [];
  return artists
    .map((a) => ({ name: a.name, match: Number(a.match) || 0 }))
    .filter((a) => a.name);
}

export async function enrichSong(song) {
  if (!LASTFM_API_KEY) return false;
  if (song.enrichedAt) return false;

  try {
    const artist = song.artistId
      ? (song.Artist ?? await Artist.findByPk(song.artistId))
      : null;
    const artistName = artist?.name?.trim();

    if (!artistName) {
      await song.update({ enrichmentAttempts: song.enrichmentAttempts + 1 });
      return false;
    }

    if (!artist.genresFetchedAt) {
      const artistTags = await fetchArtistTags(artistName);
      await artist.update({ genres: artistTags, genresFetchedAt: new Date() });
    }

    const trackTags = await fetchTrackTags(artistName, song.title);
    const genres = trackTags.length > 0 ? trackTags : (artist.genres ?? []);

    await song.update({
      genres,
      tags: trackTags,
      enrichedAt: new Date(),
      enrichmentAttempts: song.enrichmentAttempts + 1,
    });
    return true;
  }
  catch (err) {
    console.warn(`[genreService] enrichSong failed for "${song.title}":`, err.message);
    await song.update({ enrichmentAttempts: song.enrichmentAttempts + 1 }).catch(() => {});
    return false;
  }
}

export function enrichSongInBackground(song) {
  if (!LASTFM_API_KEY) return;
  enrichSong(song).catch((err) => {
    console.warn('[genreService] background enrich error:', err.message);
  });
}

export async function enrichPendingSongs(limit = 25) {

  if (!LASTFM_API_KEY) return { processed: 0, enriched: 0 };
  const songs = await Song.findAll({
    where: {
      enrichedAt: null,
      enrichmentAttempts: { [Op.lt]: MAX_ATTEMPTS },
    },
    include: [{ model: Artist }],
    order: [['id', 'ASC']],
    limit,
  });

  let enriched = 0;
  for (const song of songs)
  {
    const ok = await enrichSong(song);
    if (ok) enriched += 1;
    await new Promise((r) => setTimeout(r, 250));
  }
  return { processed: songs.length, enriched };
}
