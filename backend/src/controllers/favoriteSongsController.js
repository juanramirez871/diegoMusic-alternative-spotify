import { Artist, Song, FavoriteSong } from '../models/index.js';
import { upsertSong, songToClient } from '../services/songUpsert.js';

export async function getFavoriteSongs(req, res) {
  const userId = req.user.id;
  try {
    const records = await FavoriteSong.findAll({
      where: { userId },
      include: [{
        model: Song,
        include: [{ model: Artist, attributes: ['channelId', 'name', 'avatar'] }],
      }],
    });

    const songs = records.filter(r => r.Song).map(r => songToClient(r.Song));
    res.json({ songs });
  }
  catch (err) {
    console.error('[FavoriteSongs] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch favorite songs' });
  }
}

export async function addFavoriteSong(req, res) {
  const userId = req.user.id;
  const { youtubeId, title } = req.body;
  if (!youtubeId || !title) return res.status(400).json({ error: 'youtubeId and title required' });

  try {
    const song = await upsertSong(req.body);
    await FavoriteSong.findOrCreate({ where: { userId, songId: song.id } });
    res.status(201).json({ ok: true });
  }
  catch (err) {
    console.error('[FavoriteSongs] Add error:', err);
    res.status(500).json({ error: 'Failed to add favorite song' });
  }
}

export async function removeFavoriteSong(req, res) {
  const userId = req.user.id;
  const { youtubeId } = req.params;
  try
  {
    const song = await Song.findOne({ where: { youtubeId } });
    if (song) await FavoriteSong.destroy({ where: { userId, songId: song.id } });
    res.json({ ok: true });
  }
  catch (err) {
    console.error('[FavoriteSongs] Remove error:', err);
    res.status(500).json({ error: 'Failed to remove favorite song' });
  }
}
