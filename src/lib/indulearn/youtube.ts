/**
 * Videos de YouTube en las cápsulas: reconocer el enlace que pega el
 * administrador, armar la miniatura y cargar la API del reproductor.
 *
 * El reproductor se incrusta desde youtube-nocookie.com (modo de privacidad
 * mejorada): YouTube no guarda cookies hasta que el colaborador reproduce.
 */

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

/**
 * Id de 11 caracteres de un enlace de YouTube, o `null` si no lo es. Acepta
 * watch?v=, youtu.be/, /shorts/, /embed/, /live/ y /v/, con o sin protocolo.
 */
export function parseYouTubeId(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  let candidate: string | null = null;

  if (host === "youtu.be" || host === "www.youtu.be") {
    candidate = url.pathname.split("/")[1] ?? null;
  } else if (HOSTS.has(host)) {
    const [, first, second] = url.pathname.split("/");
    if (first === "watch") candidate = url.searchParams.get("v");
    else if (first && ["shorts", "embed", "live", "v"].includes(first)) candidate = second ?? null;
  }
  return candidate && ID.test(candidate) ? candidate : null;
}

export function isYouTubeUrl(value: string): boolean {
  return parseYouTubeId(value) !== null;
}

/** Enlace canónico para guardar: siempre el mismo formato, sea cual sea el pegado. */
export function youTubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export type YouTubeThumbQuality = "maxresdefault" | "sddefault" | "hqdefault";

export function youTubeThumbnail(id: string, quality: YouTubeThumbQuality = "hqdefault"): string {
  return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
}

export function isYouTubeThumbnail(url: string | undefined): boolean {
  return Boolean(url && /^https:\/\/i\.ytimg\.com\/vi\//.test(url));
}

/**
 * La miniatura de mejor calidad que exista. YouTube no da error cuando falta
 * una calidad: devuelve una imagen gris de 120 × 90, así que se mide.
 */
export function bestYouTubeThumbnail(id: string): Promise<string> {
  const qualities: YouTubeThumbQuality[] = ["maxresdefault", "sddefault", "hqdefault"];
  return new Promise((resolve) => {
    const tryAt = (index: number) => {
      const quality = qualities[index];
      if (!quality) return resolve(youTubeThumbnail(id, "hqdefault"));
      const image = new Image();
      image.onload = () => (image.naturalWidth > 120 ? resolve(image.src) : tryAt(index + 1));
      image.onerror = () => tryAt(index + 1);
      image.src = youTubeThumbnail(id, quality);
    };
    tryAt(0);
  });
}

// ── API del reproductor (IFrame Player API) ───────────────────────────────

/** Lo que usamos del reproductor de YouTube; el resto de la API queda fuera. */
export type YouTubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoData(): { title?: string };
  destroy(): void;
};

export type YouTubePlayerOptions = {
  videoId: string;
  width?: string | number;
  height?: string | number;
  host?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
};

type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YOUTUBE_HOST = "https://www.youtube-nocookie.com";

let apiPromise: Promise<YouTubeNamespace> | null = null;

/** Carga el script de YouTube una sola vez para toda la página. */
export function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("No se pudo cargar el reproductor de YouTube"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

/**
 * Duración y título de un video, para completar el formulario. Crea un
 * reproductor invisible, lee los datos y lo destruye. Rechaza si el video no
 * existe, es privado o no permite incrustarse.
 */
export async function fetchYouTubeDetails(
  id: string,
  signal?: AbortSignal,
): Promise<{ durationSec: number; title: string }> {
  const YT = await loadYouTubeApi();
  return new Promise((resolve, reject) => {
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:320px;height:180px;pointer-events:none;";
    const mount = document.createElement("div");
    host.appendChild(mount);
    document.body.appendChild(host);

    let player: YouTubePlayer | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => finish(new Error("YouTube no respondió a tiempo")), 15_000);

    function finish(error: Error | null, value?: { durationSec: number; title: string }) {
      clearTimeout(timeout);
      clearInterval(poll);
      signal?.removeEventListener("abort", onAbort);
      try {
        player?.destroy();
      } catch {
        // El reproductor ya no existe: nada que limpiar.
      }
      host.remove();
      if (error) reject(error);
      else if (value) resolve(value);
    }
    function onAbort() {
      finish(new DOMException("Cancelado", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort);

    player = new YT.Player(mount, {
      videoId: id,
      width: 320,
      height: 180,
      host: YOUTUBE_HOST,
      playerVars: { autoplay: 0, controls: 0, mute: 1, playsinline: 1 },
      events: {
        onReady: ({ target }) => {
          // A veces la duración llega un instante después del onReady.
          let attempts = 0;
          poll = setInterval(() => {
            attempts += 1;
            const duration = target.getDuration();
            if (duration > 0 || attempts > 20) {
              finish(null, { durationSec: Math.round(duration), title: target.getVideoData().title ?? "" });
            }
          }, 150);
        },
        onError: ({ data }) => {
          const reason =
            data === 100
              ? "El video no existe o es privado."
              : data === 101 || data === 150
                ? "El dueño del video no permite reproducirlo fuera de YouTube."
                : "YouTube no pudo cargar el video.";
          finish(new Error(reason));
        },
      },
    });
  });
}
