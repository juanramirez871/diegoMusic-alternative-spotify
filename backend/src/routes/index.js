import express from 'express';
import statusRoutes from './statusRoutes.js';
import youtubeRoutes from './youtubeRoutes.js';
import authRoutes from './authRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import artistsRoutes from './artistsRoutes.js';
import songsRoutes from './songsRoutes.js';
import playlistsRoutes from './playlistsRoutes.js';
import translateRoutes from './translateRoutes.js';
import recommendationsRoutes from './recommendationsRoutes.js';

const router = express.Router();

router.use('/status', statusRoutes);
router.use('/youtube', youtubeRoutes);
router.use('/auth', authRoutes);
router.use('/settings', settingsRoutes);
router.use('/artists', artistsRoutes);
router.use('/songs', songsRoutes);
router.use('/playlists', playlistsRoutes);
router.use('/translate', translateRoutes);
router.use('/recommendations', recommendationsRoutes);

export default router;
