import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';
import { sequelize } from './models/index.js';
import { UPLOADS_DIR } from './services/coverUpload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 47821;
const HTTP_PORT = process.env.HTTP_PORT || 47823;
const CERT_DIR = path.resolve(__dirname, '../certs');
const CERT_FILE = path.join(CERT_DIR, 'diegomusic.com.pem');
const KEY_FILE = path.join(CERT_DIR, 'diegomusic.com-key.pem');
const HTTPS_ENABLED = fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', immutable: true }));
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Diego Music API' });
});

app.use((err, req, res, next) => {
  console.error('[Express] Unhandled error:', err);
  if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal Server Error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception:', err);
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[DB] PostgreSQL connected');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('[DB] Models synced');
  }
  catch (err) {
    console.error('[DB] Connection failed:', err.message);
  }

  if (HTTPS_ENABLED) {
    const credentials = {
      cert: fs.readFileSync(CERT_FILE),
      key: fs.readFileSync(KEY_FILE),
    };
    https.createServer(credentials, app).listen(PORT, () => {
      console.log(`HTTPS on https://api.diegomusic.com:${PORT} (ɔ◔‿◔)ɔ ♥`);
    });
    http.createServer(app).listen(HTTP_PORT, () => {
      console.log(`HTTP  on http://0.0.0.0:${HTTP_PORT} (mobile/LAN)`);
    });
  } else {
    http.createServer(app).listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT} (ɔ◔‿◔)ɔ ♥`);
    });
  }
}

start();

export default app;
