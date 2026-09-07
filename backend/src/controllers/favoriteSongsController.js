import { Artist, Song, FavoriteSong } from '../models/index.js';

export async function getFavoriteSongs(req, res) {
  const userId = req.user.id;
  try {
    const records = await FavoriteSong.findAll({
      where: { userId },
      include: [{
        model: Song,
        attributes: ['youtubeId', 'title', 'thumbnailUrl', 'durationFormatted'],
        include: [{ model: Artist, attributes: ['channelId', 'name', 'avatar'] }],
      }],
    });

    const songs = records.map(r => ({
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
    }));

    res.json({ songs });
  }
  catch (err) {
    console.error('[FavoriteSongs] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch favorite songs' });
  }
}

export async function addFavoriteSong(req, res) {
  const userId = req.user.id;
  const { youtubeId, title, thumbnailUrl, durationFormatted, channelId, channelName, channelAvatar } = req.body;
  if (!youtubeId || !title) return res.status(400).json({ error: 'youtubeId and title required' });

  try {
    let artistId = null;
    if (channelId)
    {
      const [artist] = await Artist.findOrCreate({
        where: { channelId },
        defaults: { name: channelName ?? '', avatar: channelAvatar ?? '' },
      });

      if (artist.name !== channelName || artist.avatar !== channelAvatar) {
        await artist.update({ name: channelName, avatar: channelAvatar ?? '' });
      }
      artistId = artist.id;
    }

    const [song] = await Song.findOrCreate({
      where: { youtubeId },
      defaults: { title, thumbnailUrl: thumbnailUrl ?? '', durationFormatted, artistId },
    });

    if (song.title !== title || song.thumbnailUrl !== (thumbnailUrl ?? '')) {
      await song.update({ title, thumbnailUrl: thumbnailUrl ?? '', durationFormatted, artistId });
    }

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
