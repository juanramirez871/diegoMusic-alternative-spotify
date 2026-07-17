import fetch from "node-fetch";

const GOOGLE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";

const translateChunk = async (text, from, to) => {
  const params = new URLSearchParams({
    client: "gtx",
    sl: from,
    tl: to,
    dt: "t",
    q: text,
  });

  const res = await fetch(GOOGLE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Google translate respondió ${res.status}`);
  const data = await res.json();

  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  return segments.map((s) => s?.[0] ?? "").join("");
};

export const translateTexts = async (texts, from = "en", to = "es") => {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const joined = texts.join("\n");
  const translated = await translateChunk(joined, from, to);
  const lines = translated.split("\n");

  if (lines.length === texts.length) return lines;

  console.warn(`[translate] Desajuste de líneas (${lines.length} vs ${texts.length}), traduciendo línea por línea`);
  return Promise.all(texts.map(async (t) => {
    if (!t.trim()) return t;
    try { return await translateChunk(t, from, to); }
    catch { return t; }
  }));
};
