import { recommendSongsForUser, getUserTopGenres } from '../services/recommendationService.js';
import { discoverNewMusicForUser } from '../services/discoveryService.js';

export async function getRecommendations(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const songs = await recommendSongsForUser(req.user.id, limit);
    res.json({ songs });
  }
  catch (err) {
    console.error('[Recommendations] error:', err);
    res.status(500).json({ error: 'Failed to build recommendations' });
  }
}

export async function getTopGenres(req, res) {
  try {
    const genres = await getUserTopGenres(req.user.id);
    res.json({ genres });
  }
  catch (err) {
    console.error('[Recommendations] top genres error:', err);
    res.status(500).json({ error: 'Failed to compute top genres' });
  }
}

export async function getDiscovery(req, res) {
  try {
    const songs = await discoverNewMusicForUser(req.user.id);
    res.json({ songs });
  }
  catch (err) {
    console.error('[Recommendations] discovery error:', err);
    res.status(500).json({ error: 'Failed to discover new music' });
  }
}
