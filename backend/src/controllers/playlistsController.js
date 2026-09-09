import { Op } from 'sequelize';
import { Artist, Song, Playlist, PlaylistSong, PlaylistFollow, User, sequelize } from '../models/index.js';
import { upsertSong, songToClient } from '../services/songUpsert.js';
import { deleteCoverFile, coverUrlFor } from '../services/coverUpload.js';

const SONG_INCLUDE = {
  model: Song,
  include: [{ model: Artist, attributes: ['channelId', 'name', 'avatar'] }],
};

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'playlist';

async function uniqueSlug(name) {
  const base = slugify(name);
  for (let i = 0; i < 6; i++)
  {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 7)}`;
    const clash = await Playlist.findOne({ where: { slug: candidate }, attributes: ['id'] });
    if (!clash) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

async function ensureDefaultPlaylist(userId) {
  const [playlist] = await Playlist.findOrCreate({
    where: { userId, isDefault: true },
    defaults: {
      userId,
      name: 'Favoritos',
      isDefault: true,
      downloadEnabled: true,
      position: 0,
    },
  });

  return playlist;
}

function absoluteCoverUrl(req, coverUrl) {
  if (!coverUrl) return null;
  if (/^https?:\/\//i.test(coverUrl)) return coverUrl;
  if (coverUrl.startsWith('/uploads/')) {
    return `${req.protocol}://${req.get('host')}${coverUrl}`;
  }
  return coverUrl;
}

async function playlistPreview(playlistId) {
  const rows = await PlaylistSong.findAll({
    where: { playlistId },
    include: [{ model: Song, attributes: ['thumbnailUrl'] }],
    order: [['position', 'ASC']],
    limit: 4,
  });
  const songCount = await PlaylistSong.count({ where: { playlistId } });
  return {
    songCount,
    previewThumbnails: rows.map(r => r.Song?.thumbnailUrl).filter(Boolean),
  };
}

async function serializePlaylistMeta(playlist, req, extra = {}) {
  const { songCount, previewThumbnails } = await playlistPreview(playlist.id);

  return {
    id: playlist.id,
    name: playlist.name,
    coverUrl: absoluteCoverUrl(req, playlist.coverUrl),
    isDefault: playlist.isDefault,
    downloadEnabled: playlist.downloadEnabled,
    position: playlist.position,
    visibility: playlist.visibility,
    slug: playlist.slug ?? null,
    savesCount: playlist.savesCount ?? 0,
    kind: 'owned',
    readOnly: false,
    songCount,
    previewThumbnails,
    ...extra,
  };
}

async function serializeFollowedMeta(playlist, req, followPosition) {
  const { songCount, previewThumbnails } = await playlistPreview(playlist.id);
  return {
    id: playlist.id,
    name: playlist.name,
    coverUrl: absoluteCoverUrl(req, playlist.coverUrl),
    isDefault: false,
    downloadEnabled: false,
    position: followPosition,
    visibility: playlist.visibility,
    slug: playlist.slug ?? null,
    savesCount: playlist.savesCount ?? 0,
    kind: 'followed',
    readOnly: true,
    unavailable: playlist.visibility !== 'public',
    owner: playlist.User
      ? { name: playlist.User.name ?? '', avatar: playlist.User.avatar ?? '' }
      : null,
    songCount,
    previewThumbnails,
  };
}

export async function getPlaylists(req, res) {
  const userId = req.user.id;
  try {

    await ensureDefaultPlaylist(userId);
    const owned = await Playlist.findAll({
      where: { userId },
      order: [['isDefault', 'DESC'], ['position', 'ASC'], ['id', 'ASC']],
    });

    const follows = await PlaylistFollow.findAll({
      where: { userId },
      include: [{
        model: Playlist,
        include: [{ model: User, attributes: ['name', 'avatar'] }],
      }],
      order: [['position', 'ASC'], ['id', 'ASC']],
    });

    const [ownedSerialized, followedSerialized] = await Promise.all([
      Promise.all(owned.map((p) => serializePlaylistMeta(p, req))),
      Promise.all(
        follows
          .filter(f => f.Playlist)
          .map((f) => serializeFollowedMeta(f.Playlist, req, f.position)),
      ),
    ]);

    res.json({ playlists: [...ownedSerialized, ...followedSerialized] });
  }
  catch (err) {
    console.error('[Playlists] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
}

export async function getPlaylist(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const playlist = await Playlist.findOne({ where: { id, userId } });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const rows = await PlaylistSong.findAll({
      where: { playlistId: playlist.id },
      include: [SONG_INCLUDE],
      order: [['position', 'ASC']],
    });

    const meta = await serializePlaylistMeta(playlist, req);
    res.json({
      ...meta,
      songs: rows.filter(r => r.Song).map(r => songToClient(r.Song)),
    });
  }
  catch (err) {
    console.error('[Playlists] Get one error:', err);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
}

export async function createPlaylist(req, res) {
  const userId = req.user.id;
  const { name, coverUrl } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });

  try {
    const max = await Playlist.max('position', { where: { userId } });
    const playlist = await Playlist.create({
      userId,
      name: name.trim(),
      coverUrl: coverUrl ?? null,
      isDefault: false,
      downloadEnabled: false,
      position: Number.isFinite(max) ? max + 1 : 1,
    });
    res.status(201).json(await serializePlaylistMeta(playlist, req));
  }
  catch (err) {
    console.error('[Playlists] Create error:', err);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
}

export async function updatePlaylist(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, coverUrl, downloadEnabled, position, visibility } = req.body;

  try {
    const playlist = await Playlist.findOne({ where: { id, userId } });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const patch = {};
    if (name !== undefined) {
      if (playlist.isDefault) {
        return res.status(400).json({ error: 'Cannot rename the default playlist' });
      }
      if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
      patch.name = name.trim();
    }
    if (coverUrl !== undefined) patch.coverUrl = coverUrl || null;
    if (downloadEnabled !== undefined) patch.downloadEnabled = !!downloadEnabled;
    if (position !== undefined && Number.isFinite(position)) patch.position = position;

    if (visibility !== undefined) {
      if (playlist.isDefault) {
        return res.status(400).json({ error: 'The default playlist cannot be made public' });
      }
      if (visibility !== 'public' && visibility !== 'private') {
        return res.status(400).json({ error: 'visibility must be "public" or "private"' });
      }
      if (visibility === 'public' && playlist.visibility !== 'public') {
        patch.visibility = 'public';
        patch.publishedAt = new Date();
        if (!playlist.slug) patch.slug = await uniqueSlug(patch.name ?? playlist.name);
      }
      else if (visibility === 'private') {
        patch.visibility = 'private';
      }
    }

    if (Object.keys(patch).length > 0) await playlist.update(patch);
    res.json(await serializePlaylistMeta(playlist, req));
  }
  catch (err) {
    console.error('[Playlists] Update error:', err);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
}

export async function deletePlaylist(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const playlist = await Playlist.findOne({ where: { id, userId } });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    if (playlist.isDefault) {
      return res.status(403).json({ error: 'Cannot delete the default playlist' });
    }
    // No DB-level FK on playlistFollows/playlistSongs → clean up explicitly so
    // followers don't keep dangling rows.
    await sequelize.transaction(async (tx) => {
      await PlaylistFollow.destroy({ where: { playlistId: playlist.id }, transaction: tx });
      await PlaylistSong.destroy({ where: { playlistId: playlist.id }, transaction: tx });
      await playlist.destroy({ transaction: tx });
    });
    res.json({ ok: true });
  }
  catch (err) {
    console.error('[Playlists] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
}

export async function reorderPlaylists(req, res) {
  const userId = req.user.id;
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });

  try {
    const owned = await Playlist.findAll({ where: { id: { [Op.in]: order }, userId } });
    const ownedIds = new Set(owned.map(p => p.id));

    await sequelize.transaction(async (tx) => {
      let pos = 0;
      for (const rawId of order) {
        const pid = Number(rawId);
        if (!ownedIds.has(pid)) continue;
        await Playlist.update({ position: pos }, { where: { id: pid, userId }, transaction: tx });
        pos += 1;
      }
    });
    res.json({ ok: true });
  }
  catch (err) {
    console.error('[Playlists] Reorder error:', err);
    res.status(500).json({ error: 'Failed to reorder playlists' });
  }
}

export async function addSong(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { youtubeId, title } = req.body;
  if (!youtubeId || !title) return res.status(400).json({ error: 'youtubeId and title required' });

  try {
    const playlist = await Playlist.findOne({ where: { id, userId } });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const song = await upsertSong(req.body);

    const existing = await PlaylistSong.findOne({
      where: { playlistId: playlist.id, songId: song.id },
    });
    if (!existing) {
      const max = await PlaylistSong.max('position', { where: { playlistId: playlist.id } });
      await PlaylistSong.create({
        playlistId: playlist.id,
        songId: song.id,
        position: Number.isFinite(max) ? max + 1 : 0,
        addedAt: new Date(),
      });
    }
    res.status(201).json({ ok: true });
  }
  catch (err) {
    console.error('[Playlists] Add song error:', err);
    res.status(500).json({ error: 'Failed to add song to playlist' });
  }
}

export async function removeSong(req, res) {
  const userId = req.user.id;
  const { id, youtubeId } = req.params;
  try {
    const playlist = await Playlist.findOne({ where: { id, userId } });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const song = await Song.findOne({ where: { youtubeId } });
    if (song) {
      await PlaylistSong.destroy({ where: { playlistId: playlist.id, songId: song.id } });
    }
    res.json({ ok: true });
  }
  catch (err) {
    console.error('[Playlists] Remove song error:', err);
    res.status(500).json({ error: 'Failed to remove song from playlist' });
  }
}

export async function reorderSongs(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });

  try {
    const playlist = await Playlist.findOne({ where: { id, userId } });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const songs = await Song.findAll({ where: { youtubeId: { [Op.in]: order } } });
    const idByYoutubeId = new Map(songs.map(s => [s.youtubeId, s.id]));

    await sequelize.transaction(async (tx) => {
      let pos = 0;
      for (const ytId of order) {
        const songId = idByYoutubeId.get(ytId);
        if (!songId) continue;
        await PlaylistSong.update(
          { position: pos },
          { where: { playlistId: playlist.id, songId }, transaction: tx },
        );
        pos += 1;
      }
    });
    res.json({ ok: true });
  }
  catch (err) {
    console.error('[Playlists] Reorder songs error:', err);
    res.status(500).json({ error: 'Failed to reorder songs' });
  }
}

export async function uploadCover(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const playlist = await Playlist.findOne({ where: { id, userId } });
    if (!playlist) {
      if (req.file) deleteCoverFile(coverUrlFor(req.file.filename));
      return res.status(404).json({ error: 'Playlist not found' });
    }
    if (!req.file) return res.status(400).json({ error: 'cover file required' });

    const prev = playlist.coverUrl;
    const coverUrl = coverUrlFor(req.file.filename);
    await playlist.update({ coverUrl });
    if (prev && prev.startsWith('/uploads/')) deleteCoverFile(prev);

    res.status(201).json({ coverUrl: absoluteCoverUrl(req, coverUrl) });
  }
  catch (err) {
    console.error('[Playlists] Upload cover error:', err);
    if (req.file) deleteCoverFile(coverUrlFor(req.file.filename));
    res.status(500).json({ error: 'Failed to upload cover' });
  }
}

export async function deleteCover(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const playlist = await Playlist.findOne({ where: { id, userId } });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    if (playlist.coverUrl && playlist.coverUrl.startsWith('/uploads/')) {
      deleteCoverFile(playlist.coverUrl);
    }
    await playlist.update({ coverUrl: null });
    res.json({ ok: true });
  }
  catch (err) {
    console.error('[Playlists] Delete cover error:', err);
    res.status(500).json({ error: 'Failed to delete cover' });
  }
}

// --- Public playlists ---------------------------------------------------------

export async function searchPublicPlaylists(req, res) {
  const userId = req.user.id;
  const q = String(req.query.q ?? '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
  if (q.length < 2) return res.json({ playlists: [] });

  try {
    const like = `%${q}%`;
    const rows = await Playlist.findAll({
      where: {
        visibility: 'public',
        [Op.or]: [
          { name: { [Op.iLike]: like } },
          { '$User.name$': { [Op.iLike]: like } },
        ],
      },
      include: [{ model: User, attributes: ['name', 'avatar'] }],
      order: [['savesCount', 'DESC'], ['publishedAt', 'DESC']],
      limit,
      subQuery: false,
    });

    const followed = new Set(
      (await PlaylistFollow.findAll({
        where: { userId, playlistId: { [Op.in]: rows.map(r => r.id) } },
        attributes: ['playlistId'],
      })).map(f => f.playlistId),
    );

    const playlists = await Promise.all(rows.map(async (p) => {
      const { songCount, previewThumbnails } = await playlistPreview(p.id);
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        owner: { name: p.User?.name ?? '', avatar: p.User?.avatar ?? '' },
        coverUrl: absoluteCoverUrl(req, p.coverUrl),
        previewThumbnails,
        songCount,
        savesCount: p.savesCount ?? 0,
        isFollowing: followed.has(p.id),
        isOwner: p.userId === userId,
      };
    }));

    res.json({ playlists });
  }
  catch (err) {
    console.error('[Playlists] Search public error:', err);
    res.status(500).json({ error: 'Failed to search playlists' });
  }
}

export async function getPublicPlaylist(req, res) {
  const userId = req.user.id;
  const { idOrSlug } = req.params;
  const where = /^\d+$/.test(idOrSlug) ? { id: Number(idOrSlug) } : { slug: idOrSlug };

  try {
    const playlist = await Playlist.findOne({
      where,
      include: [{ model: User, attributes: ['name', 'avatar'] }],
    });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const isOwner = playlist.userId === userId;
    if (playlist.visibility !== 'public' && !isOwner) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const rows = await PlaylistSong.findAll({
      where: { playlistId: playlist.id },
      include: [SONG_INCLUDE],
      order: [['position', 'ASC']],
    });
    const { songCount, previewThumbnails } = await playlistPreview(playlist.id);
    const isFollowing = isOwner
      ? false
      : !!(await PlaylistFollow.findOne({ where: { userId, playlistId: playlist.id } }));

    res.json({
      id: playlist.id,
      slug: playlist.slug,
      name: playlist.name,
      coverUrl: absoluteCoverUrl(req, playlist.coverUrl),
      visibility: playlist.visibility,
      savesCount: playlist.savesCount ?? 0,
      owner: { name: playlist.User?.name ?? '', avatar: playlist.User?.avatar ?? '' },
      isOwner,
      isFollowing,
      songCount,
      previewThumbnails,
      songs: rows.filter(r => r.Song).map(r => songToClient(r.Song)),
    });
  }
  catch (err) {
    console.error('[Playlists] Get public error:', err);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
}

export async function followPlaylist(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const playlist = await Playlist.findByPk(id);
    if (!playlist || playlist.visibility !== 'public') {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    if (playlist.userId === userId) {
      return res.status(400).json({ error: 'Cannot follow your own playlist' });
    }

    const maxPos = await PlaylistFollow.max('position', { where: { userId } });
    const [, created] = await PlaylistFollow.findOrCreate({
      where: { userId, playlistId: playlist.id },
      defaults: {
        userId,
        playlistId: playlist.id,
        position: Number.isFinite(maxPos) ? maxPos + 1 : 0,
        followedAt: new Date(),
      },
    });
    if (created) await playlist.increment('savesCount');

    res.status(201).json({ ok: true });
  }
  catch (err) {
    console.error('[Playlists] Follow error:', err);
    res.status(500).json({ error: 'Failed to follow playlist' });
  }
}

export async function unfollowPlaylist(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const removed = await PlaylistFollow.destroy({ where: { userId, playlistId: id } });
    if (removed > 0) {
      const playlist = await Playlist.findByPk(id);
      if (playlist && (playlist.savesCount ?? 0) > 0) await playlist.decrement('savesCount');
    }
    res.json({ ok: true });
  }
  catch (err) {
    console.error('[Playlists] Unfollow error:', err);
    res.status(500).json({ error: 'Failed to unfollow playlist' });
  }
}
