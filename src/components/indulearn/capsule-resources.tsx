"use client";

import { useState } from "react";
import { ArrowUpRight, Download, FileText, Globe, Image as ImageIcon, Presentation } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { richTextToPlain } from "@/lib/indulearn/rich-text";
import type { CapsuleResource, CapsuleResourceKind } from "@/lib/indulearn/types";
import { cn } from "@/lib/utils";

import { RichText } from "./rich-text";

/** Notas más largas que esto se muestran recortadas, con «Leer más». */
const NOTES_PREVIEW_CHARS = 360;

/**
 * Texto complementario del docente. Si es largo se muestra el comienzo con un
 * desvanecido y un botón para leerlo completo; se monta con `key` por cápsula,
 * así cada una vuelve a empezar recortada.
 */
export function TeacherNotes({ notes, className }: { notes: string; className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // El largo se mide sin etiquetas: el formato no cuenta como texto.
  const isLong = richTextToPlain(notes).length > NOTES_PREVIEW_CHARS;
  const isClipped = isLong && !isExpanded;

  return (
    <section aria-labelledby="notas-docente" className={className}>
      <h2 id="notas-docente" className="text-sm font-semibold text-foreground">
        Notas del docente
      </h2>
      <div
        className={cn(
          "relative mt-2",
          isClipped &&
            "max-h-36 overflow-hidden after:absolute after:inset-x-0 after:bottom-0 after:h-12 after:bg-gradient-to-t after:from-card after:to-transparent",
        )}
      >
        <RichText html={notes} className="text-sm leading-relaxed text-muted-foreground" />
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          className="mt-2 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {isExpanded ? "Leer menos" : "Leer más"}
        </button>
      )}
    </section>
  );
}

const KIND: Record<CapsuleResourceKind, { label: string; icon: LucideIcon; tileClass: string }> = {
  pdf: { label: "PDF", icon: FileText, tileClass: "bg-red-500/10 text-red-600 dark:text-red-400" },
  presentation: {
    label: "Presentación",
    icon: Presentation,
    tileClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  image: { label: "Imagen", icon: ImageIcon, tileClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  link: { label: "Enlace", icon: Globe, tileClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
};

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Línea secundaria de un material: tipo y tamaño, o el dominio de un enlace. */
export function resourceMeta(resource: CapsuleResource): string {
  if (resource.kind === "link") return hostnameOf(resource.url);
  return [KIND[resource.kind].label, resource.size].filter(Boolean).join(" · ");
}

/** Icono de color según el tipo; las imágenes muestran su propia miniatura. */
export function ResourceThumb({ resource, className }: { resource: CapsuleResource; className?: string }) {
  if (resource.kind === "image") {
    return (
      <span className={cn("size-10 shrink-0 overflow-hidden rounded-lg border bg-white", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del propio material; next/image no aporta aquí */}
        <img src={resource.url} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      </span>
    );
  }
  const kind = KIND[resource.kind];
  const Icon = kind.icon;
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", kind.tileClass, className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/**
 * Los archivos subidos en la demo se guardan como `data:` y el navegador no
 * deja abrir esas direcciones en otra pestaña: se pasan a un Blob y se abre
 * (o descarga) su dirección temporal.
 */
function openDataUrl(dataUrl: string, fileName: string | undefined, isDownload: boolean) {
  const [header, payload = ""] = dataUrl.split(",");
  const mime = /data:([^;,]+)/.exec(header ?? "")?.[1] ?? "application/octet-stream";
  const bytes = header?.includes(";base64")
    ? Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  if (isDownload) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName ?? "material";
    link.click();
  } else {
    window.open(url, "_blank", "noopener");
  }
  // Tiempo de sobra para que la pestaña o la descarga lean el archivo.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Material que el docente sube o enlaza: cada fila abre el archivo en otra pestaña. */
export function ResourceList({ resources, className }: { resources: CapsuleResource[]; className?: string }) {
  return (
    <section aria-labelledby="material-complementario" className={className}>
      <h2 id="material-complementario" className="text-sm font-semibold text-foreground">
        Material complementario <span className="font-normal text-muted-foreground">({resources.length})</span>
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {resources.map((resource) => (
          <li key={resource.id}>
            <ResourceRow resource={resource} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResourceRow({ resource }: { resource: CapsuleResource }) {
  // Una presentación no se ve en el navegador: se descarga. El resto se abre.
  const isDownload = resource.kind === "presentation";
  const ActionIcon = isDownload ? Download : ArrowUpRight;
  const isDataUrl = resource.url.startsWith("data:");

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      download={isDownload ? (resource.fileName ?? "") : undefined}
      onClick={(event) => {
        if (!isDataUrl) return;
        event.preventDefault();
        openDataUrl(resource.url, resource.fileName, isDownload);
      }}
      className="group flex items-center gap-3 rounded-xl border bg-background p-2.5 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ResourceThumb resource={resource} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{resource.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{resourceMeta(resource)}</span>
      </span>
      <ActionIcon
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        aria-hidden
      />
      <span className="sr-only">{isDownload ? "(se descarga)" : "(se abre en otra pestaña)"}</span>
    </a>
  );
}
