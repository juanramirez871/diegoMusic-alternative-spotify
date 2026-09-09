import express from 'express';
import {
  getPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  reorderPlaylists,
  addSong,
  removeSong,
  reorderSongs,
  uploadCover,
  deleteCover,
  searchPublicPlaylists,
  getPublicPlaylist,
  followPlaylist,
  unfollowPlaylist,
} from '../controllers/playlistsController.js';
import { requireAuth } from '../middleware/auth.js';
import { coverUpload } from '../services/coverUpload.js';

const coverUploadSafe = (req, res, next) =>
  coverUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Invalid upload' });
    next();
  });

const router = express.Router();

router.use(requireAuth);
router.get('/search', searchPublicPlaylists);
router.get('/public/:idOrSlug', getPublicPlaylist);
router.post('/public/:id/follow', followPlaylist);
router.delete('/public/:id/follow', unfollowPlaylist);

router.get('/', getPlaylists);
router.post('/', createPlaylist);
router.patch('/reorder', reorderPlaylists);

router.get('/:id', getPlaylist);
router.patch('/:id', updatePlaylist);
router.delete('/:id', deletePlaylist);

router.post('/:id/songs', addSong);
router.patch('/:id/songs/reorder', reorderSongs);
router.delete('/:id/songs/:youtubeId', removeSong);

router.post('/:id/cover', coverUploadSafe, uploadCover);
router.delete('/:id/cover', deleteCover);

export default router;
