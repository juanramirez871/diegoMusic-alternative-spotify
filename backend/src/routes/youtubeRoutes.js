import express from 'express';
import * as youtubeController from '../controllers/youtubeController.js';

const router = express.Router();

router.get('/search/video', youtubeController.searchVideo);
router.get('/search/channel/videos', youtubeController.searchChannelVideos);
router.get('/audio/download', youtubeController.downloadAudio);
router.get('/audio/url', youtubeController.getAudioUrl);
router.get('/audio/prefetch', youtubeController.prefetchAudio);
router.get('/audio/warm', youtubeController.warmAudio);
router.get('/video/stream', youtubeController.streamVideo);

export default router;
