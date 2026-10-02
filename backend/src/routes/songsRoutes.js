import express from 'express';
import { getFavoriteSongs, addFavoriteSong, removeFavoriteSong } from '../controllers/favoriteSongsController.js';
import { recordPlay, getStats, updateLyricsQuery } from '../controllers/songsPlayedController.js';
import { getEnrichmentStatus, postBackfill } from '../controllers/genreController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/favorites', requireAuth, getFavoriteSongs);
router.post('/favorites', requireAuth, addFavoriteSong);
router.delete('/favorites/:youtubeId', requireAuth, removeFavoriteSong);
router.post('/played', requireAuth, recordPlay);
router.get('/played/stats', requireAuth, getStats);
router.patch('/played/lyrics-query', requireAuth, updateLyricsQuery);
router.get('/genres/status', requireAuth, getEnrichmentStatus);
router.post('/genres/backfill', requireAuth, postBackfill);

export default router;
