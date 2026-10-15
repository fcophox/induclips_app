"use client";

import { useRef, useState } from "react";
import { ImageUp, RotateCcw, Trash2 } from "lucide-react";

import { CapsuleArt } from "@/components/indulearn/capsule-card";
import { Button } from "@/components/ui/button";
import { isYouTubeThumbnail } from "@/lib/indulearn/youtube";
import type { Capsule } from "@/lib/indulearn/types";

/** Portada final: vertical como el video. Más grande no se nota y pesa más. */
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;
const MIN_WIDTH = 540;
const MIN_HEIGHT = 960;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";
const JPEG_QUALITY = 0.85;

type Optimized = { dataUrl: string; width: number; height: number; originalWidth: number; originalHeight: number };

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Peso aproximado de un `data:` en base64. */
function dataUrlBytes(dataUrl: string): number {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.round((payload.length * 3) / 4);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la imagen."));
    image.src = src;
  });
}

/** Reduce la imagen a lo que la portada necesita y la guarda como JPG. */
async function optimizeCover(file: File): Promise<Optimized> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const { naturalWidth: originalWidth, naturalHeight: originalHeight } = image;
    const scale = Math.min(1, TARGET_WIDTH / originalWidth, TARGET_HEIGHT / originalHeight);
    const width = Math.round(originalWidth * scale);
    const height = Math.round(originalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("El navegador no pudo procesar la imagen.");
    // Fondo blanco: un PNG transparente no queda negro al pasar a JPG.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), width, height, originalWidth, originalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function sourceLabel(value: string | undefined): string {
  if (!value) return "Ilustración generada";
  if (isYouTubeThumbnail(value)) return "Miniatura de YouTube";
  if (value.startsWith("data:")) return "Imagen propia";
  return "Imagen del video";
}

/**
 * Portada de la cápsula: por defecto la miniatura de YouTube; el docente puede
 * reemplazarla por una imagen propia o volver a la de YouTube.
 */
export function CoverPicker({
  value,
  onChange,
  youTubeThumb,
  fallback,
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  /** Miniatura del video de YouTube, si lo hay; permite volver a ella. */
  youTubeThumb: string | null;
  /** Para dibujar la ilustración cuando no hay imagen. */
  fallback: Pick<Capsule, "thumb" | "category">;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const isUpload = Boolean(value?.startsWith("data:"));
  const canUseYouTube = youTubeThumb !== null && value !== youTubeThumb;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotices([]);
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Usa una imagen JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError(`La imagen pesa ${formatBytes(file.size)}; el máximo es 8 MB.`);
      return;
    }
    setIsProcessing(true);
    try {
      const result = await optimizeCover(file);
      const next: string[] = [];
      const ratio = result.originalWidth / result.originalHeight;
      if (Math.abs(ratio - 9 / 16) > 0.05) {
        next.push("No es vertical 9:16: en tarjetas y en el reproductor se recortará al centro.");
      }
      if (result.originalWidth < MIN_WIDTH || result.originalHeight < MIN_HEIGHT) {
        next.push(
          `Mide ${result.originalWidth} × ${result.originalHeight} px: por debajo de ${MIN_WIDTH} × ${MIN_HEIGHT} puede verse borrosa.`,
        );
      }
      next.push(
        `Optimizada a ${result.width} × ${result.height} px · ${formatBytes(dataUrlBytes(result.dataUrl))} (original: ${formatBytes(file.size)}).`,
      );
      onChange(result.dataUrl);
      setNotices(next);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "No se pudo procesar la imagen.");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section aria-labelledby="portada-titulo" className="flex flex-col gap-3">
      <div>
        <h3 id="portada-titulo" className="text-sm font-medium text-foreground">
          Portada
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{sourceLabel(value)}</p>
      </div>

      <div className="relative aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-xl border bg-slate-950">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local o de YouTube; next/image no aporta aquí
          <img src={value} alt="Vista previa de la portada" className="size-full object-cover" />
        ) : (
          <CapsuleArt capsule={{ ...fallback, posterRef: undefined }} />
        )}
        {/* Zonas que tapan el título y los controles en el reproductor. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <Button type="button" variant="outline" size="sm" disabled={isProcessing} onClick={() => inputRef.current?.click()}>
          <ImageUp />
          {isProcessing ? "Optimizando…" : isUpload ? "Cambiar imagen" : "Subir imagen"}
        </Button>
        {canUseYouTube && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(youTubeThumb ?? undefined);
              setNotices([]);
            }}
          >
            <RotateCcw />
            Usar la de YouTube
          </Button>
        )}
        {isUpload && !youTubeThumb && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              onChange(undefined);
              setNotices([]);
            }}
          >
            <Trash2 />
            Quitar
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {notices.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground" aria-live="polite">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">Medidas y peso</p>
        <ul className="mt-1 list-disc pl-4">
          <li>Vertical 9:16. Ideal 1080 × 1920 px; mínimo 540 × 960.</li>
          <li>JPG, PNG o WebP de hasta 8 MB. Al subirla se optimiza a JPG (suele quedar bajo 300 KB).</li>
        </ul>
        <p className="mt-2 font-medium text-foreground">Consejos</p>
        <ul className="mt-1 list-disc pl-4">
          <li>Pon el rostro o el producto al centro: en las tarjetas se recortan los costados.</li>
          <li>Deja libre el cuarto inferior (marcado arriba): ahí van el título y los controles.</li>
          <li>Poco texto y buen contraste; se ve en pantallas pequeñas.</li>
          <li>Si el video de YouTube es horizontal, su miniatura se recorta: conviene subir una vertical.</li>
        </ul>
      </div>
    </section>
  );
}
