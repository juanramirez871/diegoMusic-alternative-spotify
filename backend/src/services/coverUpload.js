import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
export const COVERS_DIR = path.join(UPLOADS_DIR, 'playlist-covers');

fs.mkdirSync(COVERS_DIR, { recursive: true });

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COVERS_DIR),
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(8).toString('hex');
    cb(null, `${req.params.id}-${hash}${EXT[file.mimetype] ?? '.jpg'}`);
  },
});

export const coverUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported image type'));
  },
}).single('cover');

export function deleteCoverFile(coverUrl) {
  if (!coverUrl) return;
  const name = path.basename(coverUrl);
  if (!name || name.includes('..') || name.includes('/')) return;
  const filePath = path.join(COVERS_DIR, name);
  fs.promises.unlink(filePath).catch(() => {});
}

export function coverUrlFor(filename) {
  return `/uploads/playlist-covers/${filename}`;
}
