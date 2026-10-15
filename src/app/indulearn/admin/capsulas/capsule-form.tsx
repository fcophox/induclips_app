"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, ExternalLink, LoaderCircle } from "lucide-react";

import { RichTextEditor } from "@/components/indulearn/rich-text-editor";
import { BrandMultiSelect, Field, Modal, Select } from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/indulearn/format";
import { isEmptyRichText, trimRichText } from "@/lib/indulearn/rich-text";
import { newId, toast, upsertCapsule } from "@/lib/indulearn/store";
import {
  CATEGORIES,
  type Brand,
  type Capsule,
  type CapsuleResource,
  type CapsuleStatus,
  type Category,
} from "@/lib/indulearn/types";
import { isYouTubeThumbnail, parseYouTubeId, youTubeThumbnail, youTubeWatchUrl } from "@/lib/indulearn/youtube";

import { CoverPicker } from "./cover-picker";
import { ResourceEditor } from "./resource-editor";
import { useVideoDetails, type VideoDetails } from "./use-video-details";

const MIN_DURATION = 5;
/** Una hora: YouTube admite videos largos, aunque una cápsula no debería serlo. */
const MAX_DURATION = 3600;
const THUMB_STYLE_COUNT = 6;

type Errors = Partial<Record<"title" | "brands" | "duration" | "video", string>>;

/** Lo que se puede reproducir: YouTube, o una ruta/URL de archivo de video. */
function isValidVideoSource(value: string): boolean {
  return parseYouTubeId(value) !== null || /^(\/|https?:\/\/)/.test(value);
}

export function CapsuleForm({
  capsule,
  brands,
  onClose,
}: {
  /** `null` crea una cápsula nueva. */
  capsule: Capsule | null;
  brands: Brand[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(capsule?.title ?? "");
  const [description, setDescription] = useState(capsule?.description ?? "");
  const [notes, setNotes] = useState(capsule?.notes ?? "");
  const [resources, setResources] = useState<CapsuleResource[]>(capsule?.resources ?? []);
  const [videoRef, setVideoRef] = useState(capsule?.videoRef ?? "");
  const [duration, setDuration] = useState(capsule ? String(capsule.durationSec) : "");
  const [posterRef, setPosterRef] = useState<string | undefined>(capsule?.posterRef);
  // Ilustración de respaldo cuando no hay portada; ya no se elige a mano.
  const [thumb] = useState(() => capsule?.thumb ?? Math.floor(Math.random() * THUMB_STYLE_COUNT));
  const [category, setCategory] = useState<Category>(capsule?.category ?? CATEGORIES[0]);
  const [brandIds, setBrandIds] = useState<string[]>(capsule?.brandIds ?? []);
  const [status, setStatus] = useState<CapsuleStatus>(capsule?.status ?? "draft");
  const [errors, setErrors] = useState<Errors>({});

  const youTubeId = parseYouTubeId(videoRef);

  const details = useVideoDetails(videoRef, (found) => {
    if (found.durationSec > 0) setDuration(String(found.durationSec));
    if (found.kind === "youtube") {
      // El título de YouTube sólo propone: no pisa lo que ya escribió el docente.
      if (!title.trim() && found.title) setTitle(found.title);
      // La portada sigue al video salvo que el docente haya subido la suya.
      setPosterRef((current) => (current?.startsWith("data:") ? current : found.thumbnail));
    } else {
      setPosterRef((current) => (isYouTubeThumbnail(current) ? undefined : current));
    }
  });

  const youTubeThumb =
    details.status === "ready" && details.kind === "youtube"
      ? details.thumbnail
      : youTubeId
        ? youTubeThumbnail(youTubeId, "hqdefault")
        : null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const seconds = Number(duration);
    const source = videoRef.trim();
    const next: Errors = {};
    if (!source) next.video = "Pega el enlace del video de YouTube.";
    else if (!isValidVideoSource(source)) {
      next.video = "No es un enlace de YouTube válido. Usa youtube.com/watch?v=…, youtu.be/… o youtube.com/shorts/…";
    }
    if (title.trim().length < 3) next.title = "Escribe un título de al menos 3 caracteres.";
    if (brandIds.length === 0) next.brands = "Elige al menos una marca: sin marca nadie podría verla.";
    if (!Number.isInteger(seconds) || seconds < MIN_DURATION || seconds > MAX_DURATION) {
      next.duration = `Indica una duración entre ${MIN_DURATION} y ${MAX_DURATION} segundos.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const cleanTitle = title.trim();
    // Descripción y notas llegan como HTML del editor; vacías quedan en blanco.
    const cleanDescription = isEmptyRichText(description) ? "" : trimRichText(description);
    const cleanNotes = isEmptyRichText(notes) ? "" : trimRichText(notes);
    const cleanResources = resources.map((item) => ({ ...item, title: item.title.trim() || item.fileName || item.url }));

    upsertCapsule({
      id: capsule?.id ?? newId("c"),
      title: cleanTitle,
      description: cleanDescription,
      // Un enlace de YouTube se guarda siempre en el mismo formato.
      videoRef: youTubeId ? youTubeWatchUrl(youTubeId) : source,
      posterRef,
      durationSec: seconds,
      thumb,
      category,
      brandIds,
      status,
      publishedAt: status === "published" ? (capsule?.publishedAt ?? new Date().toISOString()) : (capsule?.publishedAt ?? null),
      // Una cápsula nueva no tiene subtítulos cargados: se muestra su título.
      subtitles: capsule?.subtitles ?? [{ at: 0, text: cleanTitle }],
      notes: cleanNotes || undefined,
      resources: cleanResources.length > 0 ? cleanResources : undefined,
    });

    toast(capsule ? "Cambios guardados" : status === "published" ? "Cápsula creada y publicada" : "Cápsula creada como borrador");
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="drawer"
      title={capsule ? "Editar cápsula" : "Crear cápsula"}
      description="Los colaboradores sólo verán la cápsula si está publicada y pertenece a una de sus marcas."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="capsule-form">
            {capsule ? "Guardar cambios" : "Crear cápsula"}
          </Button>
        </>
      }
    >
      <form
        id="capsule-form"
        onSubmit={handleSubmit}
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] xl:grid-cols-[minmax(0,1fr)_17rem]"
        noValidate
      >
        <div className="flex min-w-0 flex-col gap-5">
          <Field label="Video de YouTube" error={errors.video}>
            {(id) => (
              <Input
                id={id}
                type="url"
                inputMode="url"
                value={videoRef}
                onChange={(event) => setVideoRef(event.target.value)}
                aria-invalid={Boolean(errors.video)}
                aria-describedby="video-estado"
                placeholder="https://www.youtube.com/watch?v=… o youtu.be/… o /shorts/…"
              />
            )}
          </Field>
          <VideoStatus details={details} videoRef={videoRef} youTubeId={youTubeId} />

          <Field label="Título" error={errors.title}>
            {(id) => (
              <Input
                id={id}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={Boolean(errors.title)}
                placeholder="Ej.: Novedades del equipamiento"
              />
            )}
          </Field>

          <RichTextEditor
            label="Descripción"
            hint="Una o dos frases: es lo que se lee junto al video. En las tarjetas se muestra sin formato."
            value={description}
            onChange={setDescription}
            placeholder="Ej.: Qué aprenderá el colaborador y para qué le sirve."
            minHeightClass="min-h-20"
          />

          <RichTextEditor
            label="Notas del docente (opcional)"
            hint="Texto complementario: contexto, qué observar, ejercicios. Admite negrita, cursiva, listas y enlaces."
            value={notes}
            onChange={setNotes}
            placeholder="Ej.: Antes de ver el video, piensa en la última vez que un cliente te preguntó por…"
            minHeightClass="min-h-40"
          />

          <ResourceEditor value={resources} onChange={setResources} />

          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              label="Duración (segundos)"
              error={errors.duration}
              hint={durationHint(details, Number(duration))}
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  aria-invalid={Boolean(errors.duration)}
                  placeholder="Se completa sola"
                />
              )}
            </Field>
            <Field label="Categoría">
              {(id) => (
                <Select id={id} value={category} onChange={(event) => setCategory(event.target.value as Category)}>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Estado de publicación">
              {(id) => (
                <Select id={id} value={status} onChange={(event) => setStatus(event.target.value as CapsuleStatus)}>
                  <option value="draft">Borrador (no visible)</option>
                  <option value="published">Publicada</option>
                </Select>
              )}
            </Field>
          </div>

          <div>
            <BrandMultiSelect legend="Marcas autorizadas" brands={brands} value={brandIds} onChange={setBrandIds} />
            {errors.brands && (
              <p role="alert" className="mt-1.5 text-xs text-destructive">
                {errors.brands}
              </p>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-0 lg:self-start">
          <CoverPicker value={posterRef} onChange={setPosterRef} youTubeThumb={youTubeThumb} fallback={{ thumb, category }} />
        </aside>
      </form>
    </Modal>
  );
}

function durationHint(details: VideoDetails, seconds: number): string {
  if (details.status === "loading") return "Detectando la duración del video…";
  if (details.status === "ready") return `Detectada automáticamente (${formatDuration(details.durationSec)}). Puedes ajustarla.`;
  if (Number.isFinite(seconds) && seconds > 180) return "Recomendado: menos de 3 minutos por cápsula.";
  return "Se completa sola al detectar el video.";
}

function VideoStatus({
  details,
  videoRef,
  youTubeId,
}: {
  details: VideoDetails;
  videoRef: string;
  youTubeId: string | null;
}) {
  const fieldId = "video-estado";
  const base = "-mt-3 flex items-start gap-1.5 text-xs";

  if (details.status === "loading") {
    return (
      <p id={fieldId} className={`${base} text-muted-foreground`} aria-live="polite">
        <LoaderCircle className="mt-px size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
        {details.kind === "youtube" ? "Leyendo el video en YouTube…" : "Leyendo el archivo de video…"}
      </p>
    );
  }
  if (details.status === "error") {
    return (
      <p id={fieldId} role="alert" className={`${base} text-destructive`}>
        <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
        {details.message} Puedes guardar igual e indicar la duración a mano.
      </p>
    );
  }
  if (details.status === "ready") {
    return (
      <p id={fieldId} className={`${base} text-muted-foreground`} aria-live="polite">
        <CircleCheck className="mt-px size-3.5 shrink-0 text-success-foreground" aria-hidden />
        <span className="min-w-0">
          {details.kind === "youtube" ? (
            <>
              <span className="font-medium text-foreground">{details.title || "Video de YouTube"}</span> ·{" "}
              {formatDuration(details.durationSec)} ·{" "}
              <a
                href={youTubeWatchUrl(details.youTubeId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline"
              >
                Ver en YouTube
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </>
          ) : (
            <>Archivo de video · {formatDuration(details.durationSec)}</>
          )}
        </span>
      </p>
    );
  }
  return (
    <p id={fieldId} className={`${base} text-muted-foreground`}>
      {videoRef.trim() && !youTubeId
        ? "Pega un enlace de YouTube: youtube.com/watch?v=…, youtu.be/… o youtube.com/shorts/…"
        : "Sube el video a YouTube (puede ser «No listado») y pega aquí su enlace. Duración, título y portada se completan solos."}
    </p>
  );
}
