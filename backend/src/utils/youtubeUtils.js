import { getInnertube } from "./innertube.js";

export const extractVideoId = (url) => {
  if (url.includes("v="))        return url.split("v=")[1].split("&")[0];
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split("?")[0];
  return url;
};


export const pickPopularSortFilter = (sortFilters) => {
  if (!Array.isArray(sortFilters)) return undefined;
  return sortFilters.find((f) => String(f).toLowerCase().includes("popular"));
};

const parseDurationTextToSeconds = (text) => {
  const parts = String(text ?? "").trim().split(":").map(Number);
  if (parts.length === 0 || parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
};

const getLockupDurationText = (video) => {
  const overlays = video?.content_image?.overlays ?? [];
  for (const overlay of overlays) {
    for (const badge of overlay?.badges ?? []) {
      const text = String(badge?.text ?? "").trim();
      if (/^\d+(:\d{2})+$/.test(text)) return text;
    }
  }
  return "";
};

export const isShortVideo = (video) => {
  const type = String(video?.type ?? "");
  if (type === "ReelItem" || type === "ShortsLockupView") return true;

  if (type === "LockupView") {
    if (String(video?.content_type ?? "") === "SHORT") return true;
    const thumb = video?.content_image?.image?.[0];
    if (thumb?.width && thumb?.height && thumb.height > thumb.width) return true;
    const seconds = parseDurationTextToSeconds(getLockupDurationText(video));
    return seconds !== null && seconds > 0 && seconds <= 61;
  }

  const endpointUrl =
    video?.endpoint?.metadata?.url ??
    video?.on_tap_endpoint?.metadata?.url ?? "";
  if (String(endpointUrl).includes("/shorts/")) return true;

  const thumb = video?.best_thumbnail ?? video?.thumbnails?.[0];
  if (thumb?.width && thumb?.height && thumb.height > thumb.width) return true;

  const seconds = typeof video?.duration?.seconds === "number" && video.duration.seconds > 0
    ? video.duration.seconds
    : parseDurationTextToSeconds(video?.duration?.text);
  if (seconds !== null && seconds > 0 && seconds <= 61) return true;

  return false;
};

export const isShortChannelItem = (item) => {
  const seconds = Number(item?.lengthSeconds ?? 0);
  if (seconds > 0 && seconds <= 61) return true;

  const thumb = Array.isArray(item?.videoThumbnails) ? item.videoThumbnails[0] : null;
  if (thumb?.width && thumb?.height && thumb.height > thumb.width) return true;

  return false;
};

export const mapInnertubeVideoToChannelItem = (video) => {

  if (video?.type === "LockupView") {
    const thumbs = Array.isArray(video?.content_image?.image) ? video.content_image.image : [];
    return {
      videoId: video?.content_id ?? "",
      title: video?.metadata?.title?.text ?? "",
      author: "",
      authorId: "",
      durationText: getLockupDurationText(video),
      videoThumbnails: thumbs.map((t) => ({
        url: t?.url ?? "",
        width: t?.width ?? 0,
        height: t?.height ?? 0,
      })),
    };
  }

  const thumbs = Array.isArray(video?.thumbnails) ? video.thumbnails : [];
  return {
    videoId: video?.id ?? "",
    title: video?.title?.text ?? "",
    author: video?.author?.name ?? "",
    authorId: video?.author?.id ?? "",
    durationText: video?.duration?.text ?? "",
    videoThumbnails: thumbs.map((t) => ({
      url: t?.url ?? "",
      width: t?.width ?? 0,
      height: t?.height ?? 0,
    })),
  };
};

const extractHandleFromInput = (input) => {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  const handleMatch = raw.match(/@[\w.-]+/);
  if (handleMatch) return handleMatch[0];

  return "";
};

export const resolveChannelId = async (input) => {

  const directId = extractChannelIdFromInput(input);
  if (directId) return directId;

  const yt = await getInnertube();
  const raw = String(input ?? "").trim();
  if (!raw) throw new Error("channelId es requerido");

  const handle = extractHandleFromInput(raw);
  let urlToResolve = raw;

  if (handle) urlToResolve = `https://www.youtube.com/${handle}`;
  else if (!/^https?:\/\//i.test(urlToResolve)) urlToResolve = `https://www.youtube.com/${urlToResolve}`;

  const endpoint = await yt.resolveURL(urlToResolve);
  const browseId = endpoint?.payload?.browseId;

  if (typeof browseId === "string" && browseId.startsWith("UC")) return browseId;

  throw new Error("No se pudo resolver el channelId");
};

export const extractChannelIdFromInput = (input) => {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  const ucMatch = raw.match(/UC[a-zA-Z0-9_-]{22}/);
  if (ucMatch) return ucMatch[0];

  return "";
};