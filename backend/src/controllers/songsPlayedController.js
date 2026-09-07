import { Artist, Song, SongPlayed } from '../models/index.js';

export async function recordPlay(req, res) {

  const userId = req.user.id;
  const { youtubeId, title, thumbnailUrl, durationFormatted, channelId, channelName, channelAvatar } = req.body;
  if (!youtubeId || !title) return res.status(400).json({ error: 'youtubeId and title required' });

  try {
    let artistId = null;
    if (channelId) {
      const [artist] = await Artist.findOrCreate({
        where: { channelId },
        defaults: { name: channelName ?? '', avatar: channelAvatar ?? '' },
      });

      const patch = {};
      if (channelName && !artist.name) patch.name = channelName;
      if (channelAvatar && artist.avatar !== channelAvatar) patch.avatar = channelAvatar;
      if (Object.keys(patch).length > 0) await artist.update(patch);

      artistId = artist.id;
    }

    const [song] = await Song.findOrCreate({
      where: { youtubeId },
      defaults: { title, thumbnailUrl: thumbnailUrl ?? '', durationFormatted, artistId },
    });

    if (song.title !== title || song.thumbnailUrl !== (thumbnailUrl ?? '')) {
      await song.update({ title, thumbnailUrl: thumbnailUrl ?? '', durationFormatted, artistId });
    }

    const now = new Date();
    const existing = await SongPlayed.findOne({ where: { userId, songId: song.id } });
    if (existing) {
      await existing.update({ times: existing.times + 1, lastPlayedAt: now });
    }
    else {
      await SongPlayed.create({ userId, songId: song.id, times: 1, lastPlayedAt: now });
    }

    res.status(201).json({ ok: true });
  }
  catch (err) {
    console.error('[SongsPlayed] Record error:', err);
    res.status(500).json({ error: 'Failed to record play' });
  }
}

export async function getStats(req, res) {
  const userId = req.user.id;
  try {
    const records = await SongPlayed.findAll({
      where: { userId },
      include: [{
        model: Song,
        attributes: ['youtubeId', 'title', 'thumbnailUrl', 'durationFormatted'],
        include: [{ model: Artist, attributes: ['channelId', 'name', 'avatar'] }],
      }],
    });

    const toSongData = (r) => ({
      id: r.Song.youtubeId,
      url: `https://www.youtube.com/watch?v=${r.Song.youtubeId}`,
      title: r.Song.title,
      thumbnail: { url: r.Song.thumbnailUrl ?? '' },
      channel: {
        name: r.Song.Artist?.name ?? '',
        id: r.Song.Artist?.channelId ?? '',
        avatar: r.Song.Artist?.avatar ?? '',
      },
      duration_formatted: r.Song.durationFormatted ?? '',
      timesPlayed: r.times,
    });

    const sorted = [...records].sort((a, b) => {
      const da = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
      const db2 = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
      return db2 - da;
    });
    const recentPlayed = sorted.slice(0, 8).map(toSongData);

    const mostPlayed = [...records]
      .sort((a, b) => b.times - a.times)
      .slice(0, 10)
      .map(toSongData);

    const artistPlays = {};
    for (const r of records)
    {
      const artist = r.Song?.Artist;
      if (!artist) continue;
      const key = artist.name;
      if (!artistPlays[key])
      {
        artistPlays[key] = { name: artist.name, avatar: artist.avatar ?? '', count: 0 };
      }

      artistPlays[key].count += r.times;
    }

    const songPlays = {};
    for (const r of records)
    {
      if (!r.Song) continue;
      songPlays[r.Song.youtubeId] = {
        id: r.Song.youtubeId,
        url: `https://www.youtube.com/watch?v=${r.Song.youtubeId}`,
        title: r.Song.title,
        duration_formatted: r.Song.durationFormatted ?? '',
        thumbnail: { url: r.Song.thumbnailUrl ?? '' },
        channel: { name: r.Song.Artist?.name ?? '' },
        timesPlayed: r.times,
      };
    }

    const activeDays = [...new Set(
      records
        .filter(r => r.lastPlayedAt)
        .map(r => new Date(r.lastPlayedAt).toISOString().slice(0, 10))
    )];

    const lyricsQueries = {};
    for (const r of records) {
      if (r.Song?.youtubeId && r.lyricsQuery) {
        lyricsQueries[r.Song.youtubeId] = r.lyricsQuery;
      }
    }

    res.json({ recentPlayed, mostPlayed, artistPlays, songPlays, activeDays, lyricsQueries });
  }
  catch (err) {
    console.error('[SongsPlayed] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

export async function updateLyricsQuery(req, res) {

  const userId = req.user.id;
  const { youtubeId, query } = req.body;
  if (!youtubeId || !query) return res.status(400).json({ error: 'youtubeId and query required' });

  try
  {
    const song = await Song.findOne({ where: { youtubeId } });
    if (!song) return res.status(404).json({ error: 'Song not found' });
    const record = await SongPlayed.findOne({ where: { userId, songId: song.id } });
    if (record) await record.update({ lyricsQuery: query });
    else await SongPlayed.create({ userId, songId: song.id, times: 0, lyricsQuery: query });

    res.json({ ok: true });
  }
  catch (err) {
    console.error('[SongsPlayed] LyricsQuery error:', err);
    res.status(500).json({ error: 'Failed to update lyrics query' });
  }
}
