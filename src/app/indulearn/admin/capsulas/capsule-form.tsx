"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { THUMB_STYLES } from "@/components/indulearn/capsule-card";
import { BrandMultiSelect, Field, Modal, Select } from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { newId, toast, upsertCapsule } from "@/lib/indulearn/store";
import { CATEGORIES, type Brand, type Capsule, type CapsuleStatus, type Category } from "@/lib/indulearn/types";
import { cn } from "@/lib/utils";

const MIN_DURATION = 5;
const MAX_DURATION = 600;

type Errors = Partial<Record<"title" | "brands" | "duration", string>>;

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
  const [videoRef, setVideoRef] = useState(capsule?.videoRef ?? "");
  const [duration, setDuration] = useState(String(capsule?.durationSec ?? 90));
  const [thumb, setThumb] = useState(capsule?.thumb ?? 0);
  const [category, setCategory] = useState<Category>(capsule?.category ?? CATEGORIES[0]);
  const [brandIds, setBrandIds] = useState<string[]>(capsule?.brandIds ?? []);
  const [status, setStatus] = useState<CapsuleStatus>(capsule?.status ?? "draft");
  const [errors, setErrors] = useState<Errors>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const seconds = Number(duration);
    const next: Errors = {};
    if (title.trim().length < 3) next.title = "Escribe un título de al menos 3 caracteres.";
    if (brandIds.length === 0) next.brands = "Elige al menos una marca: sin marca nadie podría verla.";
    if (!Number.isInteger(seconds) || seconds < MIN_DURATION || seconds > MAX_DURATION) {
      next.duration = `Indica una duración entre ${MIN_DURATION} y ${MAX_DURATION} segundos.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    upsertCapsule({
      id: capsule?.id ?? newId("c"),
      title: cleanTitle,
      description: cleanDescription,
      videoRef: videoRef.trim(),
      // La portada acompaña al video: si se cambia el video, deja de servir.
      posterRef: videoRef.trim() === capsule?.videoRef ? capsule.posterRef : undefined,
      durationSec: seconds,
      thumb,
      category,
      brandIds,
      status,
      publishedAt: status === "published" ? (capsule?.publishedAt ?? new Date().toISOString()) : (capsule?.publishedAt ?? null),
      // Una cápsula nueva no tiene subtítulos cargados: se muestra su título.
      subtitles: capsule?.subtitles ?? [{ at: 0, text: cleanTitle }],
    });

    toast(capsule ? "Cambios guardados" : status === "published" ? "Cápsula creada y publicada" : "Cápsula creada como borrador");
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
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
      <form id="capsule-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
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

        <Field label="Descripción" hint="Una o dos frases: es lo que se lee junto al video.">
          {(id) => <Textarea id={id} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Video o referencia de video" hint="Una ruta (/indulearn/videos/…) o URL https se reproduce; otro texto queda como dato.">
            {(id) => (
              <Input
                id={id}
                value={videoRef}
                onChange={(event) => setVideoRef(event.target.value)}
                placeholder="https://… o nombre del archivo"
              />
            )}
          </Field>
          <Field label="Duración (segundos)" error={errors.duration}>
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
              />
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-foreground">Miniatura</legend>
          <div className="grid max-w-sm grid-cols-6 gap-2">
            {THUMB_STYLES.map((style, index) => (
              <label
                key={style.name}
                className={cn(
                  "relative block aspect-[9/16] cursor-pointer overflow-hidden rounded-lg bg-gradient-to-br ring-offset-2 ring-offset-card",
                  "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                  style.className,
                  thumb === index && "ring-2 ring-primary",
                )}
              >
                <input
                  type="radio"
                  name="thumb"
                  className="sr-only"
                  checked={thumb === index}
                  onChange={() => setThumb(index)}
                />
                <span className="sr-only">{style.name}</span>
                {thumb === index && (
                  <span className="absolute inset-0 grid place-items-center text-white">
                    <Check className="size-4" aria-hidden />
                  </span>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
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
      </form>
    </Modal>
  );
}
