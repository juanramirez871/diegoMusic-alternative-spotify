import ytch from "yt-channel-info";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
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
import { existsSync, statSync, unlinkSync, mkdirSync, readdirSync, renameSync, utimesSync } from "fs";
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
const URL_CACHE_TTL = 4 * 60 * 60 * 1000;

const AUDIO_CACHE_DIR = path.join(process.cwd(), "cache", "audio");
const AUDIO_CACHE_MAX_BYTES = 3 * 1024 * 1024 * 1024;
mkdirSync(AUDIO_CACHE_DIR, { recursive: true });

for (const file of readdirSync(AUDIO_CACHE_DIR)) {
  if (file.endsWith(".download")) {
    try { unlinkSync(path.join(AUDIO_CACHE_DIR, file)); } catch {}
  }
}

const evictAudioCacheIfNeeded = () => {
  try {
    const entries = readdirSync(AUDIO_CACHE_DIR)
      .map((name) => {
        const filePath = path.join(AUDIO_CACHE_DIR, name);
        try {
          const stats = statSync(filePath);
          return { filePath, size: stats.size, mtimeMs: stats.mtimeMs };
        } catch { return null; }
      })
      .filter(Boolean);

    let total = entries.reduce((sum, e) => sum + e.size, 0);
    if (total <= AUDIO_CACHE_MAX_BYTES) return;

    entries.sort((a, b) => a.mtimeMs - b.mtimeMs);
    for (const entry of entries) {
      if (total <= AUDIO_CACHE_MAX_BYTES) break;
      try {
        unlinkSync(entry.filePath);
        total -= entry.size;
        console.log(`[audio-cache] Evicted: ${path.basename(entry.filePath)}`);
      } catch {}
    }
  } catch (error) {
    console.warn("[audio-cache] Error en evicción:", error.message);
  }
};

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

let cachedNodePath = null;
const getNodePath = () => {
  if (!cachedNodePath) {
    try {
      cachedNodePath = execSync("which node").toString().trim();
    } catch {
      console.warn("[yt-dlp] Node no encontrado, usando ruta por defecto");
      cachedNodePath = "/usr/local/bin/node";
    }
  }
  return cachedNodePath;
};

const getYtdlpBaseArgs = (playerClient = "android,web") => {

  const cookiesPath = path.join(process.cwd(), "cookies.txt");

  const args = [
    "--no-playlist",
    "--no-part",
    "--js-runtimes", `node:${getNodePath()}`,
    "--user-agent", USER_AGENT,
    "--extractor-args", `youtube:player_client=${playerClient}`,
  ];

  if (existsSync(cookiesPath)) {
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


const runYtdlpGetUrl = (videoUrl, playerClient, { useCookies = true } = {}) => new Promise((resolve, reject) => {
  const args = [
    ...(useCookies
      ? getYtdlpBaseArgs(playerClient)
      : ["--no-playlist", "--no-part", "--force-ipv4", "--extractor-args", `youtube:player_client=${playerClient}`]),
    '-f', 'ba[ext=m4a]/ba/best',
    '-g',
    videoUrl,
  ];

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

const getGoogleVideoHeaders = async (extraHeaders = {}) => {
  const cookiesPath = path.join(process.cwd(), "cookies.txt");
  const cookieHeader = existsSync(cookiesPath) ? await parseCookiesTxt(cookiesPath) : "";
  return {
    "User-Agent": USER_AGENT,
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com",
    ...(cookieHeader && { "Cookie": cookieHeader }),
    ...extraHeaders,
  };
};

const validateDirectUrl = async (directUrl) => {
  try {
    const headers = await getGoogleVideoHeaders({ "Range": "bytes=0-1" });
    const resp = await fetch(directUrl, { headers, agent: ipv4Agent });
    if (resp.status !== 200 && resp.status !== 206) return false;
    await resp.arrayBuffer();
    return true;
  } catch {
    return false;
  }
};

const INNERTUBE_CLIENTS = ["WEB", "IOS"];

const getAudioUrlViaInnertube = async (videoId) => {
  const yt = await getInnertube();

  for (const client of INNERTUBE_CLIENTS) {
    try {
      const info = await yt.getBasicInfo(videoId, client);
      const format = info.chooseFormat({ type: "audio", quality: "best" });
      if (!format) continue;

      let directUrl = format.url;
      if (!directUrl) {
        try { directUrl = await format.decipher(yt.session.player); } catch { continue; }
      }
      if (!directUrl) continue;

      if (await validateDirectUrl(directUrl)) {
        const mimeType = format.mime_type?.split(";")[0]?.trim() || "audio/mp4";
        console.log(`[getAudioUrlViaInnertube] URL válida vía cliente ${client}: ${videoId}`);
        return { url: directUrl, mimeType };
      }
      console.warn(`[getAudioUrlViaInnertube] URL de cliente ${client} no válida (403?): ${videoId}`);
    } catch (error) {
      console.warn(`[getAudioUrlViaInnertube] Cliente ${client} falló (${error.message}): ${videoId}`);
    }
  }

  throw new Error("Innertube: ningún cliente produjo URL válida");
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
  let result = null;

  const attempts = [
    getAudioUrlViaInnertube(videoId).then((r) => {
      console.log(`[getAudioDirectUrl] Ganó Innertube: ${videoId}`);
      return { ...r, validated: true };
    }),
    (async () => {
      const directUrl = await runYtdlpGetUrl(videoUrl, "android_vr", { useCookies: false });
      if (!(await validateDirectUrl(directUrl))) throw new Error("URL de android_vr no válida");
      console.log(`[getAudioDirectUrl] Ganó yt-dlp android_vr: ${videoId}`);
      return { url: directUrl, mimeType: "audio/mp4", validated: true };
    })(),
  ];

  try {
    result = await Promise.any(attempts);
  } catch {
    console.warn(`[getAudioDirectUrl] Innertube y android_vr fallaron, último recurso android,web: ${videoId}`);
    const directUrl = await runYtdlpGetUrl(videoUrl, "android,web");
    const validated = await validateDirectUrl(directUrl);
    result = { url: directUrl, mimeType: 'audio/mp4', validated };
  }

  urlCache.set(cacheKey, { data: result, timestamp: Date.now() });
  console.log(`[getAudioDirectUrl] URL obtenida para ${videoId} (validated: ${result.validated})`);
  return result;
};


export const getCachedAudioFile = (url, startSeconds = 0) => {
  const videoId = extractVideoId(url);
  const cacheKey = `${videoId}-${startSeconds}`;
  const cacheFile = path.join(AUDIO_CACHE_DIR, `${cacheKey}.m4a`);
  if (existsSync(cacheFile)) {
    const size = statSync(cacheFile).size;
    if (size > 5000 && !downloadCache.has(cacheKey)) {
      const now = new Date();
      try { utimesSync(cacheFile, now, now); } catch {}
      return { path: cacheFile, size };
    }
  }
  return null;
};


const streamAudioFromOffset = (url, res, startSeconds) => {
  const videoId = extractVideoId(url);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const fullFileCached = getCachedAudioFile(url, 0);
  const inputArgs = fullFileCached
    ? ["-ss", String(startSeconds), "-i", fullFileCached.path]
    : ["-ss", String(startSeconds), "-i", "pipe:0"];
  if (fullFileCached) console.log(`[ffmpeg:seek] Usando archivo cacheado: ${fullFileCached.path}`);

  const ytdlp = fullFileCached ? null : spawn("yt-dlp", [
    ...getYtdlpBaseArgs(),
    videoUrl,
    "-f", "ba[ext=m4a]/ba/best",
    "-o", "-",
  ], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PATH: process.env.PATH } });

  const ffmpeg = spawn(ffmpegPath, [
    "-hide_banner", "-loglevel", "error",
    ...inputArgs,
    "-vn",
    "-c:a", "aac",
    "-b:a", "160k",
    "-f", "adts",
    "pipe:1",
  ], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, PATH: process.env.PATH } });

  ytdlp?.stderr.on("data", (d) => console.log("[yt-dlp:seek]", d.toString().trim()));
  ffmpeg.stderr.on("data", (d) => console.log("[ffmpeg:seek]", d.toString().trim()));

  ytdlp?.stdout.pipe(ffmpeg.stdin);
  ytdlp?.stdout.on("error", () => {});
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
    try { ytdlp?.kill("SIGKILL"); } catch {}
    try { ffmpeg.kill("SIGKILL"); } catch {}
  };
  ffmpeg.on("error", (err) => {
    console.error("[ffmpeg:seek] error:", err);
    if (!headersSent && !res.headersSent) res.status(500).json({ error: err.message });
    else { try { res.end(); } catch {} }
    cleanup();
  });
  ytdlp?.on("error", (err) => console.error("[yt-dlp:seek] error:", err));
  res.on("close", cleanup);
};

const proxyDirectAudio = async (res, directUrl, mimeType, rangeHeader) => {
  const headers = await getGoogleVideoHeaders(rangeHeader ? { "Range": rangeHeader } : {});
  const upstream = await fetch(directUrl, { headers, agent: ipv4Agent });
  if (!upstream.ok || !upstream.body) {
    throw new Error(`upstream respondió ${upstream.status}`);
  }

  const responseHeaders = {
    "Content-Type": mimeType,
    "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
    "Content-Length": upstream.headers.get("content-length") || undefined,
    "Content-Range": upstream.headers.get("content-range") || undefined,
    "Cache-Control": "no-store",
  };
  Object.entries(responseHeaders).forEach(([k, v]) => {
    if (v !== undefined && v !== null) res.setHeader(k, v);
  });
  res.statusCode = upstream.status === 206 ? 206 : 200;

  upstream.body.on("error", (err) => {
    console.error("[proxyDirectAudio] Error en stream:", err.message);
    try { res.end(); } catch {}
  });
  res.on("close", () => {
    try { upstream.body.destroy(); } catch {}
  });

  upstream.body.pipe(res);
};

export const streamAudioToResponse = async (url, res, startSeconds = 0, rangeHeader) => {
  if (startSeconds > 0) {
    streamAudioFromOffset(url, res, startSeconds);
    return;
  }

  try {
    const { url: directUrl, mimeType, validated } = await getAudioDirectUrl(url);
    if (validated) {
      await proxyDirectAudio(res, directUrl, mimeType, rangeHeader);
      return;
    }
    console.warn(`[streamAudioToResponse] URL no validada, usando pipe yt-dlp directamente`);
  } catch (error) {
    urlCache.delete(`audio:${extractVideoId(url)}`);
    console.warn(`[streamAudioToResponse] Proxy directo falló (${error.message}), fallback a pipe yt-dlp`);
    if (res.headersSent) { try { res.end(); } catch {} return; }
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

  const finalFile = path.join(AUDIO_CACHE_DIR, `${cacheKey}.m4a`);
  const partialFile = `${finalFile}.download`;
  const promise = new Promise((resolve, reject) => {
    if (existsSync(finalFile)) {
      const existingSize = statSync(finalFile).size;
      if (existingSize > 5000) {
        console.log(`[yt-dlp] Archivo en cache (${existingSize} bytes): ${finalFile}`);
        return resolve(finalFile);
      }
      console.warn(`[yt-dlp] Archivo en cache corrupto (${existingSize} bytes), eliminando y re-descargando: ${finalFile}`);
      try { unlinkSync(finalFile); } catch {}
    }
    try { unlinkSync(partialFile); } catch {}

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      ...getYtdlpBaseArgs(),
      videoUrl,
      "-f", "ba[ext=m4a]/ba/best",
      "-o", partialFile,
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
        const finalSize = existsSync(partialFile) ? statSync(partialFile).size : 0;
        if (finalSize <= 5000) {
          console.error(`[yt-dlp] Descarga terminó con archivo inválido (${finalSize} bytes): ${partialFile}`);
          try { unlinkSync(partialFile); } catch {}
          return reject(new Error(`yt-dlp produjo archivo vacío (${finalSize} bytes)`));
        }
        try {
          renameSync(partialFile, finalFile);
        } catch (err) {
          try { unlinkSync(partialFile); } catch {}
          return reject(err);
        }
        console.log(`[yt-dlp] Descarga completa (${finalSize} bytes): ${finalFile}`);
        evictAudioCacheIfNeeded();
        resolve(finalFile);
      }
      else {
        try { unlinkSync(partialFile); } catch {}
        reject(new Error(`yt-dlp salió con código ${code}`));
      }
    });

    proc.on("error", (err) => {
      try { unlinkSync(partialFile); } catch {}
      reject(err);
    });
  });

  promise.finally(() => {
    downloadCache.delete(cacheKey);
  }).catch(() => {});

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