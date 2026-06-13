import ytch from "yt-channel-info";
import { spawn } from "child_process";
import { unlink, readFile } from "fs/promises";
import os from "os";
import fetch from "node-fetch";
import https from "https";
import path from "path";
import {
  extractVideoId,
  pickPopularSortFilter,
  mapInnertubeVideoToChannelItem,
  resolveChannelId
} from "../utils/youtubeUtils.js";
import { getInnertube } from "../utils/innertube.js";
import { existsSync, statSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

const ipv4Agent = new https.Agent({ family: 4 });
const parseCookiesTxt = async (cookiesPath) => {
  try {
    const text = await readFile(cookiesPath, "utf8");
    return text
      .split("\n")
      .filter(l => l && !l.startsWith("#") && l.includes("\t"))
      .map(l => { const p = l.split("\t"); return p.length >= 7 ? `${p[5]}=${p[6].trim()}` : null; })
      .filter(Boolean)
      .join("; ");
  } catch {
    return "";
  }
};

const downloadCache = new Map();
const urlCache = new Map();
const URL_CACHE_TTL = 5 * 60 * 1000;


const getYtdlpBaseArgs = () => {

  const cookiesPath = path.join(process.cwd(), "cookies.txt");
  const hasCookies = existsSync(cookiesPath);
  
  let nodePath = "/usr/local/bin/node";
  try {
    nodePath = execSync("which node").toString().trim();
  } catch (e) {
    console.warn("[yt-dlp] Node no encontrado, usando ruta por defecto");
  }

  const args = [
    "--no-playlist",
    "--no-part",
    "--js-runtimes", `node:${nodePath}`,
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "--extractor-args", "youtube:player_client=android,web",
  ];

  if (hasCookies) {
    console.log("[yt-dlp] Usando cookies");
    args.push("--cookies", cookiesPath);
  }

  return args;
};

const searchVideo = async (search, limit) => {

  const yt = await getInnertube();
  const results = await yt.search(search, { type: "video" });

  return results.videos.slice(0, Number(limit)).map((video) => ({
    id: video.id ?? "",
    title: video.title?.text ?? "",
    thumbnail: {
      url: video.best_thumbnail?.url ?? video.thumbnails?.[0]?.url ?? "",
    },
    channel: {
      name: video.author?.name ?? "Unknown",
      id:   video.author?.id ?? "",
      icon: video.author?.thumbnails?.[0]?.url ?? "",
    },
    duration_formatted: video.duration?.text ?? "00:00",
  }));
};


const searchChannelVideos = async (channelId) => {

  const resolvedChannelId = await resolveChannelId(channelId);
  let channelInfo = { name: "N/A", id: resolvedChannelId };

  try {
    const yt = await getInnertube();
    const channel = await yt.getChannel(resolvedChannelId);
    channelInfo.name = channel.metadata?.title || channel.header?.author?.name || "N/A";
    channelInfo.id = channel.metadata?.id || resolvedChannelId;

    const videosTab = channel.has_videos ? await channel.getVideos() : channel;
    const popularFilter = pickPopularSortFilter(videosTab.sort_filters);
    const sortedFeed = popularFilter ? await videosTab.applySort(popularFilter) : videosTab;

    const items = sortedFeed.videos.slice(0, 40).map((video) => {
      const mapped = mapInnertubeVideoToChannelItem(video);
      if (!mapped.author || mapped.author === "N/A") mapped.author = channelInfo.name;
      if (!mapped.authorId || mapped.authorId === "N/A") mapped.authorId = channelInfo.id;
      return mapped;
    });

    if (items.length) return items;
  }
  catch (error) {
    console.warn("[searchChannelVideos] Falló Innertube:", error.message);
  }

  const fallbackSorts = ["popular", "newest", "oldest"];
  for (const sortBy of fallbackSorts)
  {
    try
    {
      const videos = await ytch.getChannelVideos({ channelId: resolvedChannelId, sortBy });
      const items = Array.isArray(videos?.items) ? videos.items : [];
      if (items.length > 0) {
        return items.map(v => ({
          ...v,
          author: (!v.author || v.author === "N/A") ? channelInfo.name : v.author,
          authorId: (!v.authorId || v.authorId === "N/A") ? channelInfo.id : v.authorId
        }));
      }
    }
    catch (error) {
      console.warn(`[searchChannelVideos] Fallback yt-channel-info (${sortBy}) falló:`, error.message);
    }
  }

  try {
    const yt = await getInnertube();
    const query = channelInfo.name && channelInfo.name !== "N/A" ? channelInfo.name : resolvedChannelId;
    const searchResults = await yt.search(query, { type: "video" });
    const candidates = (searchResults?.videos || []).filter((video) => {
      const authorId = video?.author?.id || "";
      const authorName = (video?.author?.name || "").toLowerCase();
      return authorId === resolvedChannelId || (channelInfo.name && channelInfo.name !== "N/A" && authorName.includes(channelInfo.name.toLowerCase()));
    });

    const mapped = candidates.slice(0, 40).map((video) => {
      const item = mapInnertubeVideoToChannelItem(video);
      if (!item.author || item.author === "N/A") item.author = channelInfo.name;
      if (!item.authorId || item.authorId === "N/A") item.authorId = channelInfo.id;
      return item;
    });

    if (mapped.length > 0) return mapped;

    const broadMapped = (searchResults?.videos || []).slice(0, 40).map((video) => {
      const item = mapInnertubeVideoToChannelItem(video);
      if (!item.author || item.author === "N/A") item.author = channelInfo.name;
      if (!item.authorId || item.authorId === "N/A") item.authorId = channelInfo.id;
      return item;
    });

    if (broadMapped.length > 0) return broadMapped;
  }
  catch (error) {
    console.warn("[searchChannelVideos] Fallback por búsqueda falló:", error.message);
  }

  return [];
};


export const getAudioDirectUrl = async (url) => {
  const videoId = extractVideoId(url);
  const cacheKey = `audio:${videoId}`;

  const cached = urlCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < URL_CACHE_TTL) {
    console.log(`[getAudioDirectUrl] Cache hit: ${videoId}`);
    return cached.data;
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [
    ...getYtdlpBaseArgs(),
    '-f', 'ba[ext=m4a]/ba/best',
    '-g',
    videoUrl,
  ];

  const directUrl = await new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn('yt-dlp', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: process.env.PATH }
    });

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) {
        const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const firstUrl = lines.find(l => /^https?:\/\//i.test(l));
        if (!firstUrl) return reject(new Error('No direct URL obtained'));
        resolve(firstUrl);
      } else {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
    });
    proc.on('error', reject);
  });

  const result = { url: directUrl, mimeType: 'audio/mp4' };
  urlCache.set(cacheKey, { data: result, timestamp: Date.now() });
  console.log(`[getAudioDirectUrl] URL obtenida para ${videoId}`);
  return result;
};


export const getCachedAudioFile = (url, startSeconds = 0) => {
  const videoId = extractVideoId(url);
  const cacheKey = `${videoId}-${startSeconds}`;
  const tempFile = path.join(os.tmpdir(), `ytdlp-${cacheKey}.m4a`);
  if (existsSync(tempFile)) {
    const size = statSync(tempFile).size;
    if (size > 5000 && !downloadCache.has(cacheKey)) {
      return { path: tempFile, size };
    }
  }
  return null;
};


const streamAudioFromOffset = (url, res, startSeconds) => {
  const videoId = extractVideoId(url);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const ytdlp = spawn("yt-dlp", [
    ...getYtdlpBaseArgs(),
    videoUrl,
    "-f", "ba[ext=m4a]/ba/best",
    "-o", "-",
  ], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PATH: process.env.PATH } });

  const ffmpeg = spawn(ffmpegPath, [
    "-hide_banner", "-loglevel", "error",
    "-ss", String(startSeconds),
    "-i", "pipe:0",
    "-vn",
    "-c:a", "aac",
    "-b:a", "160k",
    "-f", "adts",
    "pipe:1",
  ], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, PATH: process.env.PATH } });

  ytdlp.stderr.on("data", (d) => console.log("[yt-dlp:seek]", d.toString().trim()));
  ffmpeg.stderr.on("data", (d) => console.log("[ffmpeg:seek]", d.toString().trim()));

  ytdlp.stdout.pipe(ffmpeg.stdin);
  ytdlp.stdout.on("error", () => {});
  ffmpeg.stdin.on("error", () => {});

  let headersSent = false;
  ffmpeg.stdout.on("data", (chunk) => {
    if (!headersSent) {
      headersSent = true;
      if (!res.headersSent) {
        res.writeHead(200, {
          "Content-Type": "audio/aac",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-store",
        });
      }
    }
    if (!res.write(chunk)) ffmpeg.stdout.pause();
  });

  res.on("drain", () => ffmpeg.stdout.resume());

  ffmpeg.on("close", (code) => {
    if (code !== 0 && !headersSent && !res.headersSent) {
      res.status(500).json({ error: `ffmpeg exited with code ${code}` });
      return;
    }
    try { res.end(); } catch {}
  });

  const cleanup = () => {
    try { ytdlp.kill("SIGKILL"); } catch {}
    try { ffmpeg.kill("SIGKILL"); } catch {}
  };
  ffmpeg.on("error", (err) => {
    console.error("[ffmpeg:seek] error:", err);
    if (!headersSent && !res.headersSent) res.status(500).json({ error: err.message });
    else { try { res.end(); } catch {} }
    cleanup();
  });
  ytdlp.on("error", (err) => console.error("[yt-dlp:seek] error:", err));
  res.on("close", cleanup);
};

export const streamAudioToResponse = (url, res, startSeconds = 0) => {
  if (startSeconds > 0) {
    streamAudioFromOffset(url, res, startSeconds);
    return;
  }

  const videoId = extractVideoId(url);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [
    ...getYtdlpBaseArgs(),
    videoUrl,
    "-f", "ba[ext=m4a]/ba/best",
    "-o", "-",
  ];

  const proc = spawn("yt-dlp", args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PATH: process.env.PATH }
  });

  proc.stderr.on("data", (d) => console.log("[yt-dlp:stream]", d.toString().trim()));

  let headersSent = false;
  let firstChunk = true;

  proc.stdout.on("data", (chunk) => {
    if (firstChunk) {
      firstChunk = false;
      if (!res.headersSent) {
        res.writeHead(200, {
          "Content-Type": "audio/mp4",
          "Transfer-Encoding": "chunked",
        });
        headersSent = true;
      }
    }
    if (!res.write(chunk)) proc.stdout.pause();
  });

  res.on("drain", () => proc.stdout.resume());

  proc.on("close", (code) => {
    if (code !== 0 && !headersSent && !res.headersSent) {
      res.status(500).json({ error: `yt-dlp exited with code ${code}` });
      return;
    }
    try { res.end(); } catch {}
  });

  proc.on("error", (err) => {
    console.error("[yt-dlp:stream] error:", err);
    if (!headersSent && !res.headersSent) {
      res.status(500).json({ error: err.message });
    }
    else { try { res.end(); } catch {} }
  });

  res.on("close", () => {
    try { proc.kill(); } catch {}
  });
};

export const downloadAudio = (url, startSeconds = 0) => {

  const videoId = extractVideoId(url);
  const cacheKey = `${videoId}-${startSeconds}`;

  if (downloadCache.has(cacheKey)) {
    console.log(`[yt-dlp] Cache hit: ${cacheKey}`);
    return downloadCache.get(cacheKey);
  }

  const tempFile = path.join(os.tmpdir(), `ytdlp-${cacheKey}.m4a`);
  const promise = new Promise((resolve, reject) => {
    if (existsSync(tempFile)) {
      const existingSize = statSync(tempFile).size;
      if (existingSize > 5000) {
        console.log(`[yt-dlp] Archivo en disco (${existingSize} bytes): ${tempFile}`);
        return resolve(tempFile);
      }
      console.warn(`[yt-dlp] Archivo en disco corrupto (${existingSize} bytes), eliminando y re-descargando: ${tempFile}`);
      try { unlinkSync(tempFile); } catch {}
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      ...getYtdlpBaseArgs(),
      videoUrl,
      "-f", "ba[ext=m4a]/ba/best",
      "-o", tempFile,
      ...(startSeconds > 0 ? ["--download-sections", `*${startSeconds}-inf`] : []),
    ];

    const proc = spawn("yt-dlp", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PATH: process.env.PATH }
    });

    proc.stdout.on("data", (d) => console.log("[yt-dlp]", d.toString().trim()));
    proc.stderr.on("data", (d) => console.log("[yt-dlp]", d.toString().trim()));

    proc.on("close", (code) => {
      if (code === 0) {
        const finalSize = existsSync(tempFile) ? statSync(tempFile).size : 0;
        if (finalSize <= 5000) {
          console.error(`[yt-dlp] Descarga terminó con archivo inválido (${finalSize} bytes): ${tempFile}`);
          downloadCache.delete(cacheKey);
          try { unlinkSync(tempFile); } catch {}
          return reject(new Error(`yt-dlp produjo archivo vacío (${finalSize} bytes)`));
        }
        console.log(`[yt-dlp] Descarga completa (${finalSize} bytes): ${tempFile}`);
        resolve(tempFile);
      }
      else {
        downloadCache.delete(cacheKey);
        try { unlinkSync(tempFile); } catch {}
        reject(new Error(`yt-dlp salió con código ${code}`));
      }
    });

    proc.on("error", (err) => {
      downloadCache.delete(cacheKey);
      reject(err);
    });
  });

  promise.then((filePath) => {
    setTimeout(async () => {
      downloadCache.delete(cacheKey);
      try { await unlink(filePath); } catch {}
    }, 10 * 60 * 1000);
  }).catch(() => {
    downloadCache.delete(cacheKey);
  });

  downloadCache.set(cacheKey, promise);
  return promise;
};


const VIDEO_QUALITY_FORMAT = {
  low: "18/best[height<=360][ext=mp4]/best[height<=360]/best",
  medium: "18/22/best[ext=mp4]/best",
  high: "22/best[height<=1080][ext=mp4][acodec!=none]/best[height<=720][ext=mp4][acodec!=none]/best[ext=mp4]/18/best",
};

export const getVideoDirectSource = async (url, quality = 'low') => {

  const videoId = extractVideoId(url);
  const cacheKey = `video:${videoId}:${quality}`;

  const cached = urlCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < URL_CACHE_TTL) {
    console.log(`[getVideoDirectSource] Cache hit: ${videoId} (${quality})`);
    return cached.data;
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const formatSelector = VIDEO_QUALITY_FORMAT[quality] ?? VIDEO_QUALITY_FORMAT.low;

  console.log(`[getVideoDirectSource] Obteniendo URL para: ${videoId} (calidad: ${quality})`);
  const args = [
    "--no-playlist",
    "--no-part",
    "--force-ipv4",
    "--extractor-args", "youtube:player_client=android_vr",
    "-f", formatSelector,
    "-g",
    videoUrl,
  ];

  const directUrl = await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn("yt-dlp", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PATH: process.env.PATH }
    });

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) {
        const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        console.log(`[getVideoDirectSource] yt-dlp retornó ${lines.length} línea(s)`);
        if (lines.length > 1) console.warn(`[getVideoDirectSource] ADVERTENCIA: múltiples URLs (formato merged). Líneas: ${lines.join(' | ')}`);
        const firstUrl = lines.find((l) => /^https?:\/\//i.test(l));
        if (!firstUrl) {
          console.error(`[getVideoDirectSource] Error: No se obtuvo URL directa del video. stdout: ${stdout}, stderr: ${stderr}`);
          return reject(new Error("No se obtuvo URL directa del video"));
        }
        console.log(`[getVideoDirectSource] URL seleccionada: ${firstUrl.substring(0, 80)}...`);
        resolve(firstUrl);
      }
      else {
        console.error(`[getVideoDirectSource] Error (código ${code}): ${stderr}`);
        reject(new Error(stderr || `yt-dlp salió con código ${code}`));
      }
    });

    proc.on("error", (err) => {
      console.error(`[getVideoDirectSource] Error de proceso: ${err.message}`);
      reject(err);
    });
  });

  const lower = String(directUrl).toLowerCase();
  const isHls = lower.includes("hls_playlist") || lower.includes(".m3u8") || lower.includes("manifest.googlevideo");
  const mimeType = isHls
    ? "application/vnd.apple.mpegurl"
    : lower.includes(".webm") || lower.includes("mime=video%2Fwebm")
      ? "video/webm"
      : "video/mp4";

  console.log(`[getVideoDirectSource] URL obtenida correctamente (mime: ${mimeType})`);
  urlCache.set(cacheKey, { data: { directUrl, mimeType }, timestamp: Date.now() });
  return { directUrl, mimeType };
};

export const proxyVideoStream = async (res, sourceUrl, mimeType, rangeHeader) => {

  const cookiesPath = path.join(process.cwd(), "cookies.txt");
  const cookieHeader = existsSync(cookiesPath) ? await parseCookiesTxt(cookiesPath) : "";

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com",
    ...(cookieHeader && { "Cookie": cookieHeader }),
  };

  if (rangeHeader) headers.Range = rangeHeader;
  console.log(`[proxyVideoStream] Iniciando stream. Range: ${rangeHeader || "N/A"}`);
  const upstream = await fetch(sourceUrl, { headers, agent: ipv4Agent });

  if (!upstream.ok) {
    console.error(`[proxyVideoStream] Error al obtener stream de YouTube: ${upstream.status} ${upstream.statusText}`);
    res.status(upstream.status).end();
    return;
  }

  const status = upstream.status === 206 ? 206 : upstream.status;
  const upstreamHeaders = {
    "Content-Type": mimeType,
    "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
    "Content-Length": upstream.headers.get("content-length") || undefined,
    "Content-Range": upstream.headers.get("content-range") || undefined,
    "Cache-Control": "no-store",
  };

  Object.entries(upstreamHeaders).forEach(([k, v]) => {
    if (v !== undefined && v !== null) res.setHeader(k, v);
  });

  res.statusCode = status;
  if (!upstream.body) {
    console.error("[proxyVideoStream] El cuerpo de la respuesta upstream es nulo");
    res.end();
    return;
  }
  upstream.body.on("error", (err) => {
    console.error("[proxyVideoStream] Error en el stream body:", err.message);
    try { res.end(); } catch {}
  });

  upstream.body.pipe(res);
};

export { searchVideo, searchChannelVideos };