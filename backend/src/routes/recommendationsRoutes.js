import express from 'express';
import { getRecommendations, getTopGenres, getDiscovery } from '../controllers/recommendationsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getRecommendations);
router.get('/genres', requireAuth, getTopGenres);
router.get('/discover', requireAuth, getDiscovery);

export default router;
