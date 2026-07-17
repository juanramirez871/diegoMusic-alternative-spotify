import * as youtubeService from "../services/youtubeService.js";
import * as coverResolverService from "../services/coverResolverService.js";
import { enrichFromCacheAndWarm } from '../services/mediaMetadataService.js';
import { createReadStream, statSync } from "fs";
import { Song, Artist } from "../models/index.js";

const AUDIO_URL_TTL_MS = 4 * 60 * 60 * 1000;
const mapWithConcurrency = async (items, worker, concurrency = 4) => {

  const results = new Array(items.length);
  let index = 0;

  const run = async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  };

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => run());
  await Promise.all(workers);
  return results;
};

const enrichSearchVideos = async (videos = []) => mapWithConcurrency(videos, async (video) => {
  try {
    const enriched = enrichFromCacheAndWarm({
      title: video?.title,
      artistName: video?.channel?.name,
      thumbnailUrl: video?.thumbnail?.url,
      artistAvatar: video?.channel?.icon,
    });

    return {
      ...video,
      thumbnail: { ...(video.thumbnail || {}), url: enriched.thumbnailUrl || video?.thumbnail?.url || '' },
      channel: { ...(video.channel || {}), icon: enriched.artistAvatar || video?.channel?.icon || '' },
    };
  }
  catch {
    return video;
  }
}, 4);

const enrichChannelVideos = async (videos = []) => mapWithConcurrency(videos, async (video) => {
  try {
    const primaryThumb = video?.videoThumbnails?.[0]?.url || '';
    const enriched = enrichFromCacheAndWarm({
      title: video?.title,
      artistName: video?.author,
      thumbnailUrl: primaryThumb,
      artistAvatar: '',
    });

    const nextThumb = enriched.thumbnailUrl || primaryThumb;
    const thumbs = Array.isArray(video.videoThumbnails) ? [...video.videoThumbnails] : [];
    if (thumbs.length > 0) {
      thumbs[0] = { ...thumbs[0], url: nextThumb };
    }

    return {
      ...video,
      videoThumbnails: thumbs,
      authorAvatar: enriched.artistAvatar || video?.authorAvatar || '',
    };
  }
  catch {
    return video;
  }
}, 4);

const searchVideo = async (req, res) => {
  try {
    const videos = await youtubeService.searchVideo(req.query.search, req.query.limit);
    const enrichedVideos = await enrichSearchVideos(videos);
    res.status(200).json(enrichedVideos);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const searchChannelVideos = async (req, res) => {
  try {
    const videos = await youtubeService.searchChannelVideos(req.query.channelId);
    const enrichedVideos = await enrichChannelVideos(videos);
    res.status(200).json(enrichedVideos);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const downloadAudio = async (req, res) => {
  try {

    const { url, start = 0 } = req.query;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const cached = youtubeService.getCachedAudioFile(url, Number(start));
    if (!cached) {
      console.log(`[downloadAudio] No hay cache, streaming progresivo (start=${start})`);
      youtubeService.downloadAudio(url, Number(start)).catch(() => {});
      return await youtubeService.streamAudioToResponse(url, res, Number(start), req.headers.range);
    }

    const filePath = cached.path;
    const fileSize = cached.size;
    const rangeHeader = req.headers.range;

    if (rangeHeader)
    {
      const [startByte, endByte] = rangeHeader
        .replace("bytes=", "")
        .split("-")
        .map(Number);

      const start = startByte || 0;
      const end   = endByte   || fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Type":   "audio/mp4",
        "Accept-Ranges":  "bytes",
        "Content-Range":  `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": chunkSize,
      });

      createReadStream(filePath, { start, end }).pipe(res);

    }
    else {
      res.writeHead(200, {
        "Content-Type": "audio/mp4",
        "Accept-Ranges": "bytes",
        "Content-Length": fileSize,
      });

      createReadStream(filePath).pipe(res);
    }

  }
  catch (error) {
    console.error("Error in downloadAudio:", error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

const streamVideo = async (req, res) => {
  try
  {
    const { url, quality } = req.query;
    if (!url) return res.status(400).json({ error: "url es requerido" });
    const rangeHeader = req.headers.range;
    const safeQuality = ['low', 'medium', 'high'].includes(quality) ? quality : 'low';

    const { directUrl, mimeType } = await youtubeService.getVideoDirectSource(url, safeQuality);
    if (mimeType === 'application/vnd.apple.mpegurl') {
      return res.redirect(302, directUrl);
    }
    await youtubeService.proxyVideoStream(res, directUrl, mimeType, rangeHeader);
  }
  catch (error) {
    console.error("Error in streamVideo:", error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

const getAudioUrl = async (req, res) => {
  try {

    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const videoId = url.match(/[?&]v=([^&]+)/)?.[1] ?? url.split('/').pop();
    if (videoId)
    {
      const song = await Song.findOne({ where: { youtubeId: videoId } });
      if (song?.audioUrl && song?.audioUrlCachedAt)
      {
        const age = Date.now() - new Date(song.audioUrlCachedAt).getTime();
        if (age < AUDIO_URL_TTL_MS) return res.json({ url: song.audioUrl, mimeType: 'audio/mp4' });
      }
    }

    const result = await youtubeService.getAudioDirectUrl(url);
    if (videoId)
    {
      Song.update(
        { audioUrl: result.url, audioUrlCachedAt: new Date() },
        { where: { youtubeId: videoId } }
      ).catch(() => {});
    }

    res.json(result);
  }
  catch (error) {
    console.error('Error in getAudioUrl:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

const prefetchAudio = (req, res) => {

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });
  res.status(202).end();

  youtubeService.getAudioDirectUrl(url).catch((err) =>
    console.warn('[prefetch] Error warming audio cache:', err.message)
  );

  youtubeService.downloadAudio(url, 0).catch((err) =>
    console.warn('[prefetch] Error warming yt-dlp cache:', err.message)
  );
};

const warmAudio = async (req, res) => {
  try
  {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url is required' });
    await youtubeService.downloadAudio(url, 0);
    res.json({ ready: true });
  }
  catch (error) {
    console.error('Error in warmAudio:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

const resolveCover = async (req, res) => {

  try
  {
    const { title, artist, album, limit, rawTitle, minScore } = req.query;
    if (!title && !artist && !album && !rawTitle) {
      return res.status(400).json({ error: "title, artist, album or rawTitle is required" });
    }

    const result = await coverResolverService.resolveCover({
      title,
      artist,
      album,
      rawTitle,
      limit,
      minScore,
    });

    res.status(200).json(result);
  }
  catch (error) {
    console.error("Error in resolveCover:", error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

const resolveArtistImage = async (req, res) => {

  try
  {
    const { artist, rawTitle, limit, minScore } = req.query;
    if (!artist && !rawTitle) {
      return res.status(400).json({ error: 'artist or rawTitle is required' });
    }

    const result = await coverResolverService.resolveArtistImage({
      artist,
      rawTitle,
      limit,
      minScore,
    });

    res.status(200).json(result);
  }
  catch (error) {
    console.error('Error in resolveArtistImage:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

export {
  searchVideo,
  searchChannelVideos,
  downloadAudio,
  streamVideo,
  getAudioUrl,
  prefetchAudio,
  warmAudio,
  resolveCover,
  resolveArtistImage,
};
