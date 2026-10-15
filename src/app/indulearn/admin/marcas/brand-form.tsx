"use client";

import { useId, useRef, useState } from "react";
import { Check, ImageUp, Trash2 } from "lucide-react";

import { BrandAvatar, BrandBadge, Field, Modal, Select } from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, upsertBrand } from "@/lib/indulearn/store";
import type { Brand, BrandStatus } from "@/lib/indulearn/types";
import { uniqueSlug } from "@/lib/slug";
import { isValidHex } from "@/lib/theme/color";
import { cn } from "@/lib/utils";

/**
 * Colores sugeridos: los seis de los gráficos (se adaptan al modo oscuro) y
 * algunos más para marcas que no calzan con ellos.
 */
const PALETTE: { value: string; name: string }[] = [
  { value: "var(--chart-1)", name: "Azul" },
  { value: "var(--chart-2)", name: "Naranjo" },
  { value: "var(--chart-3)", name: "Verde" },
  { value: "var(--chart-4)", name: "Ámbar" },
  { value: "var(--chart-5)", name: "Rosa" },
  { value: "var(--chart-6)", name: "Verde oscuro" },
  { value: "#0c4c8e", name: "Azul marino" },
  { value: "#7c3aed", name: "Violeta" },
  { value: "#dc2626", name: "Rojo" },
  { value: "#0891b2", name: "Cian" },
  { value: "#1f2937", name: "Grafito" },
];

const LOGO_MAX_SIDE = 256;
const LOGO_MAX_INPUT = 2 * 1024 * 1024;
const SVG_MAX_BYTES = 200 * 1024;
const LOGO_ACCEPT = "image/png,image/svg+xml,image/webp,image/jpeg";

/** Sigla de 2 letras: iniciales si hay varias palabras, si no las dos primeras letras. */
function initialsFor(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

/**
 * Logo listo para guardar: un SVG se guarda tal cual (se muestra como imagen,
 * así que no ejecuta nada); una imagen se reduce a 256 px por lado como PNG
 * para conservar la transparencia.
 */
async function prepareLogo(file: File): Promise<string> {
  if (file.type === "image/svg+xml") {
    if (file.size > SVG_MAX_BYTES) throw new Error("El SVG pesa más de 200 KB; simplifícalo o usa un PNG.");
    return readFileAsDataUrl(file);
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("No se pudo leer la imagen."));
      element.src = objectUrl;
    });
    const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("El navegador no pudo procesar la imagen.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

type Errors = Partial<Record<"name" | "short" | "color" | "logo", string>>;

export function BrandForm({
  brand,
  existing,
  onClose,
}: {
  /** `null` crea una marca nueva. */
  brand: Brand | null;
  existing: Brand[];
  onClose: () => void;
}) {
  const colorLegendId = useId();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(brand?.name ?? "");
  const [short, setShort] = useState(brand?.short ?? "");
  // La sigla sigue al nombre hasta que el administrador la escribe a mano.
  const [isShortEdited, setIsShortEdited] = useState(Boolean(brand));
  const [color, setColor] = useState(brand?.colorVar ?? PALETTE[0]!.value);
  const [customColor, setCustomColor] = useState(
    brand && isValidHex(brand.colorVar) && !PALETTE.some((item) => item.value === brand.colorVar) ? brand.colorVar : "#0c4c8e",
  );
  const [logoRef, setLogoRef] = useState<string | undefined>(brand?.logoRef);
  const [status, setStatus] = useState<BrandStatus>(brand?.status ?? "active");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const isCustom = !PALETTE.some((item) => item.value === color);
  const preview: Brand = {
    id: brand?.id ?? "preview",
    name: name.trim() || "Nueva marca",
    short: short.trim() || "??",
    colorVar: color,
    logoRef,
    status,
    isDemo: brand?.isDemo ?? false,
  };

  async function handleLogo(file: File | undefined) {
    if (!file) return;
    setErrors((current) => ({ ...current, logo: undefined }));
    if (!LOGO_ACCEPT.split(",").includes(file.type)) {
      setErrors((current) => ({ ...current, logo: "Usa un PNG, SVG, WebP o JPG." }));
      return;
    }
    if (file.size > LOGO_MAX_INPUT) {
      setErrors((current) => ({ ...current, logo: "El logo pesa más de 2 MB." }));
      return;
    }
    setIsProcessing(true);
    try {
      setLogoRef(await prepareLogo(file));
    } catch (problem) {
      setErrors((current) => ({
        ...current,
        logo: problem instanceof Error ? problem.message : "No se pudo procesar el logo.",
      }));
    } finally {
      setIsProcessing(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanShort = short.trim().toUpperCase();
    const others = existing.filter((item) => item.id !== brand?.id);
    const next: Errors = {};
    if (cleanName.length < 2) next.name = "Escribe el nombre de la marca.";
    else if (others.some((item) => item.name.toLowerCase() === cleanName.toLowerCase())) {
      next.name = "Ya existe una marca con ese nombre.";
    }
    if (!/^[A-Z0-9]{1,3}$/.test(cleanShort)) next.short = "Usa de 1 a 3 letras o números.";
    if (!color.startsWith("var(") && !isValidHex(color)) next.color = "Elige un color válido.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    upsertBrand({
      id: brand?.id ?? uniqueSlug(cleanName, existing.map((item) => item.id)),
      name: cleanName,
      short: cleanShort,
      colorVar: color,
      logoRef,
      status,
      isDemo: brand?.isDemo ?? false,
    });
    toast(brand ? "Marca actualizada" : `Marca «${cleanName}» creada`);
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title={brand ? "Editar marca" : "Agregar marca"}
      description="La marca organiza qué cápsulas ve cada colaborador. Su color la identifica en etiquetas y gráficos."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="brand-form">
            {brand ? "Guardar cambios" : "Agregar marca"}
          </Button>
        </>
      }
    >
      <form id="brand-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <Field label="Nombre" error={errors.name}>
            {(id) => (
              <Input
                id={id}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!isShortEdited) setShort(initialsFor(event.target.value));
                }}
                aria-invalid={Boolean(errors.name)}
                placeholder="Ej.: Toyota"
                autoFocus
              />
            )}
          </Field>
          <Field label="Sigla" error={errors.short} hint="Se ve si no hay logo.">
            {(id) => (
              <Input
                id={id}
                value={short}
                maxLength={3}
                onChange={(event) => {
                  setShort(event.target.value.toUpperCase());
                  setIsShortEdited(true);
                }}
                aria-invalid={Boolean(errors.short)}
                className="uppercase"
              />
            )}
          </Field>
        </div>

        <fieldset aria-describedby={errors.color ? `${colorLegendId}-error` : undefined}>
          <legend id={colorLegendId} className="mb-2 text-sm font-medium text-foreground">
            Color
          </legend>
          <div role="radiogroup" aria-labelledby={colorLegendId} className="flex flex-wrap items-center gap-2">
            {PALETTE.map((item) => {
              const isSelected = color === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={item.name}
                  title={item.name}
                  onClick={() => setColor(item.value)}
                  className={cn(
                    "grid size-8 place-items-center rounded-full outline-none ring-offset-2 ring-offset-card transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    isSelected && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: item.value }}
                >
                  {isSelected && <Check className="size-4 text-white drop-shadow" aria-hidden />}
                </button>
              );
            })}
            <label
              className={cn(
                "relative flex h-8 cursor-pointer items-center gap-2 rounded-full border pl-1 pr-3 text-xs font-medium text-foreground transition-colors hover:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                isCustom && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
              )}
            >
              <span className="size-6 rounded-full border" style={{ backgroundColor: customColor }} aria-hidden />
              Personalizado
              <input
                type="color"
                value={customColor}
                onChange={(event) => {
                  setCustomColor(event.target.value);
                  setColor(event.target.value);
                }}
                onClick={() => setColor(customColor)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Elegir un color personalizado"
              />
            </label>
            {isCustom && <span className="font-mono text-xs uppercase text-muted-foreground">{color}</span>}
          </div>
          {errors.color && (
            <p id={`${colorLegendId}-error`} role="alert" className="mt-1.5 text-xs text-destructive">
              {errors.color}
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Logo (opcional)</span>
          <div className="flex flex-wrap items-center gap-3">
            <BrandAvatar brand={preview} className="size-16 rounded-2xl" />
            <div className="flex flex-wrap gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept={LOGO_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(event) => handleLogo(event.target.files?.[0])}
              />
              <Button type="button" variant="outline" size="sm" disabled={isProcessing} onClick={() => logoInputRef.current?.click()}>
                <ImageUp />
                {isProcessing ? "Procesando…" : logoRef ? "Cambiar logo" : "Subir logo"}
              </Button>
              {logoRef && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setLogoRef(undefined)}
                >
                  <Trash2 />
                  Quitar
                </Button>
              )}
            </div>
          </div>
          {errors.logo ? (
            <p role="alert" className="text-xs text-destructive">
              {errors.logo}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              PNG o SVG con fondo transparente, de al menos 128 px. Hasta 2 MB: se reduce a 256 px. Se muestra sobre
              blanco; sin logo se usa la sigla sobre el color.
            </p>
          )}
        </div>

        <Field
          label="Estado"
          hint={
            status === "active"
              ? "Se puede asignar a cápsulas y colaboradores."
              : "Aún no se puede asignar: queda lista para activarla después."
          }
        >
          {(id) => (
            <Select id={id} value={status} onChange={(event) => setStatus(event.target.value as BrandStatus)} className="w-full sm:w-48">
              <option value="active">Activa</option>
              <option value="pending">Pendiente</option>
            </Select>
          )}
        </Field>

        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-xs font-medium text-muted-foreground">Vista previa</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <BrandAvatar brand={preview} />
            <BrandAvatar brand={{ ...preview, logoRef: undefined }} />
            <BrandBadge brand={preview} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
