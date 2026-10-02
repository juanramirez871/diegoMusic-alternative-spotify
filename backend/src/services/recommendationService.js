import { Op } from 'sequelize';
import { Song, Artist, SongPlayed, Playlist, PlaylistSong } from '../models/index.js';

const HALF_LIFE_DAYS = 60;
const PLAYLIST_BONUS_WEIGHT = 3;
const CANDIDATE_POOL_SIZE = 500;

function recencyWeight(lastPlayedAt) {
  if (!lastPlayedAt) return 0.5;
  const ageDays = (Date.now() - new Date(lastPlayedAt).getTime()) / 86400000;
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export async function buildUserTasteProfile(userId) {
  const [played, savedSongIds] = await Promise.all([
    SongPlayed.findAll({
      where: { userId },
      include: [{
        model: Song,
        where: { enrichedAt: { [Op.ne]: null } },
        attributes: ['id', 'genres', 'artistId'],
      }],
    }),
    PlaylistSong.findAll({
      include: [{
        model: Playlist,
        where: { userId },
        attributes: [],
      }],
      attributes: ['songId'],
    }).then((rows) => new Set(rows.map((r) => r.songId))),
  ]);

  const genreWeight = new Map();
  const artistWeight = new Map();
  const seenSongIds = new Set();

  for (const row of played) {
    const song = row.Song;
    if (!song || !song.genres?.length) continue;
    seenSongIds.add(song.id);

    const base = (row.times ?? 1) * recencyWeight(row.lastPlayedAt);
    const bonus = savedSongIds.has(song.id) ? PLAYLIST_BONUS_WEIGHT : 1;
    const weight = base * bonus;

    for (const genre of song.genres) {
      genreWeight.set(genre, (genreWeight.get(genre) ?? 0) + weight);
    }
    if (song.artistId) {
      artistWeight.set(song.artistId, (artistWeight.get(song.artistId) ?? 0) + weight);
    }
  }

  const magnitude = Math.sqrt(
    [...genreWeight.values()].reduce((sum, w) => sum + w * w, 0),
  ) || 1;
  const genres = {};
  for (const [g, w] of genreWeight) genres[g] = w / magnitude;

  return {
    genres,
    topArtistIds: [...artistWeight.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id),
    seenSongIds,
    hasHistory: played.length > 0,
  };
}

function cosineSimilarity(profileGenres, songGenres) {
  if (!songGenres?.length) return 0;
  let dot = 0;
  for (const g of songGenres) dot += profileGenres[g] ?? 0;
  const candidateMagnitude = Math.sqrt(songGenres.length) || 1;
  return dot / candidateMagnitude;
}

export async function recommendSongsForUser(userId, limit = 20) {

  const profile = await buildUserTasteProfile(userId);
  const candidates = await Song.findAll({
    where: {
      enrichedAt: { [Op.ne]: null },
      genres: { [Op.ne]: [] },
      ...(profile.seenSongIds.size > 0
        ? { id: { [Op.notIn]: [...profile.seenSongIds] } }
        : {}),
    },
    include: [{ model: Artist, attributes: ['channelId', 'name', 'avatar'] }],
    limit: CANDIDATE_POOL_SIZE,
    order: [['id', 'DESC']],
  });

  if (!profile.hasHistory) {
    return shuffleDiverse(candidates, limit);
  }

  const scored = candidates.map((song) => {
    const genreScore = cosineSimilarity(profile.genres, song.genres);
    const artistBoost = profile.topArtistIds.includes(song.artistId) ? 0.15 : 0;
    return { song, score: genreScore + artistBoost };
  });

  scored.sort((a, b) => b.score - a.score);

  return diversify(scored, limit).map(({ song, score }) => ({
    ...songToRecommendation(song),
    score: Number(score.toFixed(4)),
  }));
}

function diversify(scored, limit) {
  const out = [];
  const perArtistCount = new Map();
  const MAX_PER_ARTIST = 2;

  for (const entry of scored) {
    if (out.length >= limit) break;
    const artistId = entry.song.artistId ?? 0;
    const count = perArtistCount.get(artistId) ?? 0;
    if (count >= MAX_PER_ARTIST) continue;
    perArtistCount.set(artistId, count + 1);
    out.push(entry);
  }

  if (out.length < limit) {
    const chosenIds = new Set(out.map((e) => e.song.id));
    for (const entry of scored) {
      if (out.length >= limit) break;
      if (chosenIds.has(entry.song.id)) continue;
      out.push(entry);
    }
  }
  return out;
}

function shuffleDiverse(songs, limit) {
  const shuffled = [...songs].sort(() => Math.random() - 0.5);
  const out = [];
  const perArtistCount = new Map();
  for (const song of shuffled) {
    if (out.length >= limit) break;
    const count = perArtistCount.get(song.artistId ?? 0) ?? 0;
    if (count >= 1) continue;
    perArtistCount.set(song.artistId ?? 0, count + 1);
    out.push(song);
  }
  return out.slice(0, limit).map((song) => ({ ...songToRecommendation(song), score: null }));
}

function songToRecommendation(song) {
  return {
    id: song.youtubeId,
    url: `https://www.youtube.com/watch?v=${song.youtubeId}`,
    title: song.title,
    thumbnail: { url: song.thumbnailUrl ?? '' },
    channel: {
      name: song.Artist?.name ?? '',
      id: song.Artist?.channelId ?? '',
      avatar: song.Artist?.avatar ?? '',
    },
    duration_formatted: song.durationFormatted ?? '',
    genres: song.genres ?? [],
  };
}

export async function getUserTopGenres(userId, limit = 10) {
  const profile = await buildUserTasteProfile(userId);
  return Object.entries(profile.genres)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, weight]) => ({ genre, weight: Number(weight.toFixed(4)) }));
}
