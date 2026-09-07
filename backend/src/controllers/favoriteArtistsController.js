import { Artist, FavoriteArtist } from '../models/index.js';

export async function getFavoriteArtists(req, res) {
  const userId = req.user.id;
  try {
    const records = await FavoriteArtist.findAll({
      where: { userId },
      include: [{ model: Artist, attributes: ['channelId', 'name', 'avatar'] }],
    });

    const artists = records.map(r => ({
      id: r.Artist.channelId,
      name: r.Artist.name,
      avatar: r.Artist.avatar,
    }));
    res.json({ artists });
  }
  catch (err) {
    console.error('[FavoriteArtists] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch favorite artists' });
  }
}

export async function addFavoriteArtist(req, res) {
  const userId = req.user.id;
  const { channelId, name, avatar } = req.body;
  if (!channelId || !name) return res.status(400).json({ error: 'channelId and name required' });
  try
  {
    const bestAvatar = avatar || '';
    const [artist] = await Artist.findOrCreate({
      where: { channelId },
      defaults: { name, avatar: bestAvatar },
    });

    const patch = {};
    if (name && !artist.name) patch.name = name;
    if (bestAvatar && artist.avatar !== bestAvatar) patch.avatar = bestAvatar;
    if (Object.keys(patch).length > 0) await artist.update(patch);

    await FavoriteArtist.findOrCreate({ where: { userId, artistId: artist.id } });
    res.status(201).json({
      ok: true,
      artist: { id: artist.channelId, name: artist.name, avatar: (bestAvatar || artist.avatar) ?? '' },
    });
  }
  catch (err) {
    console.error('[FavoriteArtists] Add error:', err);
    res.status(500).json({ error: 'Failed to add favorite artist' });
  }
}

export async function removeFavoriteArtist(req, res) {
  const userId = req.user.id;
  const { channelId } = req.params;
  try {
    const artist = await Artist.findOne({ where: { channelId } });
    if (artist) {
      await FavoriteArtist.destroy({ where: { userId, artistId: artist.id } });
    }
    res.json({ ok: true });
  }
  catch (err) {
    console.error('[FavoriteArtists] Remove error:', err);
    res.status(500).json({ error: 'Failed to remove favorite artist' });
  }
}
