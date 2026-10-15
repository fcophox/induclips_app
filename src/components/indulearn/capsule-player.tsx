"use client";

import { useEffect, useRef, useState } from "react";
import { Captions, CaptionsOff, Check, Pause, Play, Volume2, VolumeX } from "lucide-react";

import { formatDuration } from "@/lib/indulearn/format";
import { richTextToPlain } from "@/lib/indulearn/rich-text";
import { recordProgress } from "@/lib/indulearn/store";
import { YOUTUBE_HOST, loadYouTubeApi, parseYouTubeId, type YouTubePlayer } from "@/lib/indulearn/youtube";
import type { Brand, Capsule, Settings } from "@/lib/indulearn/types";
import { cn } from "@/lib/utils";

import { CapsuleArt } from "./capsule-card";

const TICK_MS = 200;

type Props = {
  capsule: Capsule;
  userId: string;
  brands: Brand[];
  settings: Settings;
  /** Sólo la cápsula visible reproduce; las demás quedan en pausa. */
  isActive: boolean;
  /** Segundo desde el que se retoma una cápsula en curso. */
  resumeAt: number;
  isCompleted: boolean;
  /** Título y descripción superpuestos sobre el video (vista móvil). */
  hasOverlayInfo?: boolean;
  /** Deja sitio arriba para los filtros que flotan sobre el video en móvil. */
  hasTopInset?: boolean;
  /** Acciones flotantes a la derecha (guardar, compartir…). */
  rail?: React.ReactNode;
  className?: string;
};

/** Rutas locales y URLs http(s) de archivos se reproducen con `<video>`. */
function isPlayableSource(ref: string): boolean {
  return /^(\/|https?:\/\/)/.test(ref);
}

/** Estado "terminado" del reproductor de YouTube (YT.PlayerState.ENDED). */
const YT_ENDED = 0;

/**
 * Reproductor de cápsulas.
 *
 * - Video de YouTube: se incrusta con la API de YouTube, sin sus controles; se
 *   manejan con los nuestros y la posición se lee cada tick. Sólo la cápsula
 *   visible tiene reproductor: las demás muestran su portada.
 * - Archivo de video: `<video>`, con la posición de sus eventos.
 * - Sin video (`demo://…`): se simula con un reloj y un fondo animado.
 *
 * Controles, subtítulos y registro de progreso son los mismos en los tres casos.
 */
export function CapsulePlayer({
  capsule,
  userId,
  brands,
  settings,
  isActive,
  resumeAt,
  isCompleted,
  hasOverlayInfo = false,
  hasTopInset = false,
  rail,
  className,
}: Props) {
  const [position, setPosition] = useState(resumeAt);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasSubtitles, setHasSubtitles] = useState(settings.subtitlesDefault);
  const mediaRef = useRef<HTMLVideoElement>(null);
  const youTubeId = parseYouTubeId(capsule.videoRef);
  const isYouTube = youTubeId !== null;
  const hasMedia = !isYouTube && isPlayableSource(capsule.videoRef);
  const isSimulated = !isYouTube && !hasMedia;
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const youTubeHostRef = useRef<HTMLDivElement>(null);
  const youTubeRef = useRef<YouTubePlayer | null>(null);
  const [isYouTubeReady, setIsYouTubeReady] = useState(false);
  const positionRef = useRef(position);
  positionRef.current = position;

  const duration = mediaDuration ?? capsule.durationSec;
  const hasEnded = position >= duration;

  // YouTube: el reproductor existe sólo mientras la cápsula está en pantalla.
  // Arranca silenciado (así el navegador deja que empiece solo) y desde donde
  // se había quedado.
  useEffect(() => {
    if (!youTubeId || !isActive) return;
    const host = youTubeHostRef.current;
    if (!host) return;
    let isCancelled = false;
    const mount = document.createElement("div");
    host.appendChild(mount);

    loadYouTubeApi()
      .then((YT) => {
        if (isCancelled) return;
        youTubeRef.current = new YT.Player(mount, {
          videoId: youTubeId,
          width: "100%",
          height: "100%",
          host: YOUTUBE_HOST,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            mute: 1,
            playsinline: 1,
            rel: 0,
            start: Math.floor(positionRef.current),
          },
          events: {
            onReady: ({ target }) => {
              if (isCancelled) return;
              const length = target.getDuration();
              if (length > 0) setMediaDuration(length);
              setIsYouTubeReady(true);
            },
            onStateChange: ({ data, target }) => {
              if (data === YT_ENDED) setPosition(target.getDuration());
            },
          },
        });
      })
      .catch(() => {
        // Sin conexión con YouTube queda la portada; los controles siguen respondiendo.
      });

    return () => {
      isCancelled = true;
      setIsYouTubeReady(false);
      try {
        youTubeRef.current?.destroy();
      } catch {
        // El iframe ya no existe.
      }
      youTubeRef.current = null;
      host.replaceChildren();
    };
  }, [youTubeId, isActive]);

  // Al entrar en pantalla arranca sola y en silencio (si así está configurado);
  // al salir se pausa, para que nunca haya dos cápsulas corriendo a la vez.
  useEffect(() => {
    setIsPlaying(isActive && settings.autoplayMuted);
    if (isActive) setIsMuted(true);
  }, [isActive, settings.autoplayMuted]);

  // Reloj del modo simulado.
  useEffect(() => {
    if (!isSimulated || !isPlaying || !isActive) return;
    const id = setInterval(() => {
      setPosition((current) => Math.min(duration, current + TICK_MS / 1000));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isSimulated, isPlaying, isActive, duration]);

  // YouTube no avisa del avance: se lee su posición en cada tick.
  useEffect(() => {
    if (!isYouTubeReady || !isPlaying || !isActive) return;
    const id = setInterval(() => {
      const current = youTubeRef.current?.getCurrentTime();
      if (typeof current === "number") setPosition(current);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isYouTubeReady, isPlaying, isActive]);

  // Con video real, el estado manda sobre el elemento. El silencio va primero:
  // los navegadores sólo permiten arrancar solo a un video silenciado.
  useEffect(() => {
    if (mediaRef.current) mediaRef.current.muted = isMuted;
    if (isYouTubeReady) {
      if (isMuted) youTubeRef.current?.mute();
      else youTubeRef.current?.unMute();
    }
  }, [isMuted, isYouTubeReady]);

  useEffect(() => {
    if (!isYouTubeReady) return;
    if (isPlaying && isActive) youTubeRef.current?.playVideo();
    else youTubeRef.current?.pauseVideo();
  }, [isPlaying, isActive, isYouTubeReady]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (isPlaying && isActive) {
      // El navegador puede bloquear la reproducción automática.
      media.play().catch(() => setIsPlaying(false));
    } else {
      media.pause();
    }
  }, [isPlaying, isActive]);

  useEffect(() => {
    if (hasEnded) setIsPlaying(false);
  }, [hasEnded]);

  // El avance se registra una vez por segundo reproducido, no en cada tick.
  const wholeSecond = Math.floor(position);
  useEffect(() => {
    if (isPlaying && wholeSecond > 0) recordProgress(userId, capsule.id, wholeSecond);
  }, [isPlaying, wholeSecond, userId, capsule.id]);

  function seek(seconds: number) {
    setPosition(seconds);
    if (mediaRef.current) mediaRef.current.currentTime = seconds;
    youTubeRef.current?.seekTo(seconds, true);
  }

  function togglePlay() {
    if (hasEnded) {
      seek(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((current) => !current);
  }

  const cue = hasSubtitles
    ? [...capsule.subtitles].reverse().find((item) => position >= item.at)?.text
    : undefined;
  const percent = (position / duration) * 100;
  const playLabel = hasEnded ? "Reproducir de nuevo" : isPlaying ? "Pausar" : "Reproducir";

  return (
    <div className={cn("relative isolate h-full w-full overflow-hidden bg-slate-950 text-white", className)}>
      <CapsuleArt capsule={capsule} isAnimated={isPlaying && isSimulated} />
      {isYouTube && (
        // El iframe no recibe clics: los controles son los nuestros, que van encima.
        <div
          ref={youTubeHostRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-black transition-opacity duration-300 [&_iframe]:size-full",
            isYouTubeReady ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      {hasMedia && (
        <video
          ref={mediaRef}
          src={capsule.videoRef}
          poster={capsule.posterRef}
          muted
          playsInline
          preload={isActive ? "auto" : "metadata"}
          aria-hidden
          className="absolute inset-0 size-full object-cover"
          onLoadedMetadata={(event) => {
            const media = event.currentTarget;
            setMediaDuration(media.duration);
            if (resumeAt > 0 && resumeAt < media.duration) media.currentTime = resumeAt;
          }}
          onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
          onEnded={(event) => setPosition(event.currentTarget.duration)}
        />
      )}

      {/* Toda la superficie pausa o reanuda, como en cualquier app de video corto. */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={`${playLabel}: ${capsule.title}`}
        className="absolute inset-0 z-10 grid place-items-center outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-white/70"
      >
        {!isPlaying && (
          <span className="grid size-16 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
            <Play className="size-7 translate-x-0.5 fill-current" aria-hidden />
          </span>
        )}
      </button>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center gap-1.5 bg-gradient-to-b from-black/55 to-transparent p-4 pb-10",
          hasTopInset && "pt-14 lg:pt-4",
        )}
      >
        {brands.map((brand) => (
          <span
            key={brand.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-0.5 text-xs font-medium backdrop-blur-sm"
          >
            <span className="size-2 rounded-full ring-1 ring-white/60" style={{ backgroundColor: brand.colorVar }} aria-hidden />
            {brand.name}
          </span>
        ))}
        <span className="rounded-full bg-black/45 px-2 py-0.5 text-xs backdrop-blur-sm">{capsule.category}</span>
        {isCompleted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-medium text-black">
            <Check className="size-3" aria-hidden />
            Completada
          </span>
        )}
      </div>

      {rail && <div className="absolute bottom-36 right-3 z-30 flex flex-col items-center gap-4">{rail}</div>}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-4 pt-16">
        {cue && (
          // En móvil se deja libre la columna de acciones de la derecha.
          <div className={cn(rail && "pr-14 lg:pr-0")}>
            <p className="mx-auto w-fit max-w-full rounded-md bg-black/70 px-2.5 py-1 text-center text-sm leading-snug">
              {cue}
            </p>
          </div>
        )}

        {hasOverlayInfo && (
          // En escritorio esta información ya está en el panel lateral.
          <div className={cn("min-w-0 lg:hidden", rail && "pr-14")}>
            <h2 className="line-clamp-2 text-base font-semibold leading-snug">{capsule.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-white/80">{richTextToPlain(capsule.description)}</p>
          </div>
        )}

        <div className="pointer-events-auto flex flex-col gap-1.5">
          <input
            type="range"
            min={0}
            max={duration}
            step={1}
            value={Math.floor(position)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Posición de reproducción"
            aria-valuetext={`${formatDuration(position)} de ${formatDuration(duration)}`}
            className="h-4 w-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/30 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-white/40"
            style={{
              // La parte ya reproducida se pinta en la propia pista.
              ["--il-fill" as string]: `${percent}%`,
              backgroundImage:
                "linear-gradient(to right, #fff var(--il-fill), rgb(255 255 255 / 0.3) var(--il-fill))",
              backgroundSize: "100% 4px",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />

          <div className="flex items-center gap-1">
            <PlayerButton label={playLabel} onClick={togglePlay}>
              {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
            </PlayerButton>
            <span className="px-1 text-xs tabular-nums text-white/85">
              {formatDuration(position)} / {formatDuration(duration)}
            </span>
            {isSimulated && <span className="ml-auto hidden text-[11px] text-white/60 sm:inline">Video demostrativo</span>}
            <PlayerButton
              label={
                isMuted ? (isSimulated ? "Activar sonido (el video demostrativo no tiene audio)" : "Activar sonido") : "Silenciar"
              }
              isPressed={!isMuted}
              onClick={() => setIsMuted((current) => !current)}
              className={cn("ml-auto", isSimulated && "sm:ml-0")}
            >
              {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </PlayerButton>
            <PlayerButton
              label={hasSubtitles ? "Ocultar subtítulos" : "Mostrar subtítulos"}
              isPressed={hasSubtitles}
              onClick={() => setHasSubtitles((current) => !current)}
            >
              {hasSubtitles ? <Captions className="size-5" /> : <CaptionsOff className="size-5" />}
            </PlayerButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerButton({
  label,
  isPressed,
  onClick,
  className,
  children,
}: {
  label: string;
  isPressed?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={isPressed}
      className={cn(
        "grid size-11 place-items-center rounded-full outline-none transition-colors hover:bg-white/15 focus-visible:ring-[3px] focus-visible:ring-white/70",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Botón redondo con etiqueta, para la columna de acciones sobre el video. */
export function RailButton({
  label,
  ariaLabel,
  isPressed,
  onClick,
  children,
}: {
  label: string;
  /** Nombre accesible cuando la etiqueta visible es sólo un número. */
  ariaLabel?: string;
  isPressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isPressed}
      aria-label={ariaLabel}
      className="group flex flex-col items-center gap-1 text-[11px] font-medium text-white outline-none"
    >
      <span className="grid size-11 place-items-center rounded-full bg-black/45 backdrop-blur-sm transition-colors group-hover:bg-black/65 group-focus-visible:ring-[3px] group-focus-visible:ring-white/70">
        {children}
      </span>
      {label}
    </button>
  );
}
