"use client";

import { useEffect, useRef, useState } from "react";

import { bestYouTubeThumbnail, fetchYouTubeDetails, parseYouTubeId } from "@/lib/indulearn/youtube";

/** Espera tras la última tecla antes de consultar el video. */
const DEBOUNCE_MS = 450;

export type VideoDetails =
  | { status: "idle" }
  | { status: "loading"; kind: "youtube" | "file" }
  | { status: "ready"; kind: "youtube"; youTubeId: string; durationSec: number; title: string; thumbnail: string }
  | { status: "ready"; kind: "file"; durationSec: number }
  | { status: "error"; message: string };

function isFileSource(value: string): boolean {
  return /^(\/|https?:\/\/)/.test(value);
}

/** Duración de un archivo de video, leyendo sólo sus metadatos. */
function fetchFileDuration(src: string, signal: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (Number.isFinite(duration) && duration > 0) resolve(Math.round(duration));
      else reject(new Error("El archivo no informa su duración."));
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("No se pudo leer el video. Revisa la dirección."));
    };
    signal.addEventListener("abort", () => {
      cleanup();
      reject(new DOMException("Cancelado", "AbortError"));
    });
    video.src = src;
  });
}

/**
 * Lee duración, título y miniatura del video que se está escribiendo. Avisa
 * con `onDetected` (una vez por video) para que el formulario complete los
 * campos; el estado sirve para mostrar qué está pasando.
 */
export function useVideoDetails(value: string, onDetected: (details: Extract<VideoDetails, { status: "ready" }>) => void) {
  const [details, setDetails] = useState<VideoDetails>({ status: "idle" });
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    const source = value.trim();
    const youTubeId = parseYouTubeId(source);
    if (!source || (!youTubeId && !isFileSource(source))) {
      setDetails({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setDetails({ status: "loading", kind: youTubeId ? "youtube" : "file" });
      try {
        let ready: Extract<VideoDetails, { status: "ready" }>;
        if (youTubeId) {
          const [info, thumbnail] = await Promise.all([
            fetchYouTubeDetails(youTubeId, controller.signal),
            bestYouTubeThumbnail(youTubeId),
          ]);
          ready = { status: "ready", kind: "youtube", youTubeId, thumbnail, ...info };
        } else {
          ready = { status: "ready", kind: "file", durationSec: await fetchFileDuration(source, controller.signal) };
        }
        if (controller.signal.aborted) return;
        setDetails(ready);
        onDetectedRef.current(ready);
      } catch (error) {
        if (controller.signal.aborted) return;
        setDetails({ status: "error", message: error instanceof Error ? error.message : "No se pudo leer el video." });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return details;
}
