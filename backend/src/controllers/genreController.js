import { Op } from 'sequelize';
import { Song } from '../models/index.js';
import { enrichPendingSongs } from '../services/genreService.js';

export async function getEnrichmentStatus(req, res) {
  try {
    const [total, enriched, exhausted] = await Promise.all([
      Song.count(),
      Song.count({ where: { enrichedAt: { [Op.ne]: null } } }),
      Song.count({ where: { enrichedAt: null, enrichmentAttempts: { [Op.gte]: 5 } } }),
    ]);
    res.json({
      total,
      enriched,
      pending: total - enriched - exhausted,
      exhausted,
      hasApiKey: !!process.env.LASTFM_API_KEY,
    });
  }
  catch (err) {
    console.error('[Genres] status error:', err);
    res.status(500).json({ error: 'Failed to fetch enrichment status' });
  }
}

export async function postBackfill(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const result = await enrichPendingSongs(limit);
    res.json(result);
  }
  catch (err) {
    console.error('[Genres] backfill error:', err);
    res.status(500).json({ error: 'Failed to backfill genres' });
  }
}
