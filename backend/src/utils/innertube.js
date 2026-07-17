import { Innertube } from "youtubei.js";
import { BG } from "bgutils-js";
import { JSDOM } from "jsdom";

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
const PO_TOKEN_TTL = 6 * 60 * 60 * 1000;

let innertube = null;
let innertubePromise = null;
let sessionCreatedAt = 0;

const generatePoToken = async (visitorData) => {
  const dom = new JSDOM();
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
  });

  const bgConfig = {
    fetch: (input, init) => fetch(input, init),
    globalObj: globalThis,
    identifier: visitorData,
    requestKey: REQUEST_KEY,
  };

  const challenge = await BG.Challenge.create(bgConfig);
  if (!challenge) throw new Error("BotGuard: no se obtuvo challenge");

  const script = challenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;
  if (!script) throw new Error("BotGuard: challenge sin script de intérprete");
  new Function(script)();

  const { poToken } = await BG.PoToken.generate({
    program: challenge.program,
    globalName: challenge.globalName,
    bgConfig,
  });

  if (!poToken) throw new Error("BotGuard: no se generó poToken");
  return poToken;
};

const createSession = async () => {
  const temp = await Innertube.create({ retrieve_player: false });
  const visitorData = temp.session.context.client.visitorData;

  let poToken;
  try {
    if (!visitorData) throw new Error("sin visitorData");
    poToken = await generatePoToken(visitorData);
    console.log("[innertube] PO token generado correctamente");
  } catch (error) {
    console.warn("[innertube] No se pudo generar PO token, sesión sin token:", error.message);
  }

  return Innertube.create({
    ...(poToken && { po_token: poToken }),
    ...(visitorData && { visitor_data: visitorData }),
    generate_session_locally: true,
  });
};

export const getInnertube = async () => {
  const expired = Date.now() - sessionCreatedAt > PO_TOKEN_TTL;
  if (innertube && !expired) return innertube;

  if (!innertubePromise) {
    innertubePromise = createSession()
      .then((yt) => {
        innertube = yt;
        sessionCreatedAt = Date.now();
        return yt;
      })
      .finally(() => { innertubePromise = null; });
  }

  if (innertube) return innertube;
  return innertubePromise;
};
