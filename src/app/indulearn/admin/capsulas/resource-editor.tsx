"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Link2, Trash2, Upload } from "lucide-react";

import { ResourceThumb, resourceMeta } from "@/components/indulearn/capsule-resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newId } from "@/lib/indulearn/store";
import type { CapsuleResource, CapsuleResourceKind } from "@/lib/indulearn/types";

/**
 * La demo guarda todo en el navegador: un archivo subido viaja dentro del
 * estado como `data:`. Más de esto llenaría el almacenamiento enseguida.
 */
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_RESOURCES = 10;

const ACCEPT = ".pdf,.ppt,.pptx,.odp,.key,image/*";

function kindOfFile(file: File): CapsuleResourceKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (
    /\.(pptx?|odp|key)$/.test(name) ||
    file.type.includes("presentation") ||
    file.type === "application/vnd.ms-powerpoint"
  ) {
    return "presentation";
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : name;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Material complementario de una cápsula: el docente sube PDF, presentaciones
 * o imágenes, o agrega enlaces; puede renombrarlos, ordenarlos y quitarlos.
 */
export function ResourceEditor({
  value,
  onChange,
}: {
  value: CapsuleResource[];
  onChange: (next: CapsuleResource[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkUrlId = useId();
  const linkTitleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const isFull = value.length >= MAX_RESOURCES;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const room = MAX_RESOURCES - value.length;
    const added: CapsuleResource[] = [];
    const problems: string[] = [];

    setIsReading(true);
    for (const file of Array.from(files).slice(0, room)) {
      const kind = kindOfFile(file);
      if (!kind) {
        problems.push(`«${file.name}» no es PDF, presentación ni imagen.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        problems.push(`«${file.name}» pesa ${formatBytes(file.size)}; en esta demo el máximo es 2 MB.`);
        continue;
      }
      try {
        added.push({
          id: newId("r"),
          kind,
          title: titleFromFileName(file.name),
          url: await readAsDataUrl(file),
          size: formatBytes(file.size),
          fileName: file.name,
        });
      } catch {
        problems.push(`No se pudo leer «${file.name}».`);
      }
    }
    setIsReading(false);
    if (files.length > room) problems.push(`Se admiten hasta ${MAX_RESOURCES} materiales por cápsula.`);

    if (added.length > 0) onChange([...value, ...added]);
    setError(problems.length > 0 ? problems.join(" ") : null);
    // Permite volver a elegir el mismo archivo después de quitarlo.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!isHttpUrl(url)) {
      setLinkError("Escribe una dirección completa que empiece con https://");
      return;
    }
    onChange([...value, { id: newId("r"), kind: "link", title: linkTitle.trim() || url, url }]);
    setLinkUrl("");
    setLinkTitle("");
    setLinkError(null);
    setError(null);
    setIsAddingLink(false);
  }

  function rename(id: string, title: string) {
    onChange(value.map((item) => (item.id === id ? { ...item, title } : item)));
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  function remove(id: string) {
    onChange(value.filter((item) => item.id !== id));
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium text-foreground">Material complementario</legend>
      <p className="text-xs text-muted-foreground">
        PDF, presentaciones (PPT, PPTX), imágenes o enlaces. En esta demo los archivos se guardan en el navegador: hasta 2 MB
        cada uno.
      </p>

      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((resource, index) => (
            <li key={resource.id} className="flex items-center gap-3 rounded-xl border bg-background p-2.5">
              <ResourceThumb resource={resource} />
              <div className="min-w-0 flex-1">
                <Input
                  value={resource.title}
                  onChange={(event) => rename(resource.id, event.target.value)}
                  onBlur={(event) => {
                    // Un material sin nombre no se entiende en la lista del colaborador.
                    if (!event.target.value.trim()) rename(resource.id, resource.fileName ?? resource.url);
                  }}
                  aria-label={`Nombre del material ${index + 1}`}
                  className="h-8"
                />
                <p className="mt-1 truncate text-xs text-muted-foreground">{resourceMeta(resource)}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Subir «${resource.title}»`}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label={`Bajar «${resource.title}»`}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => remove(resource.id)}
                  aria-label={`Quitar «${resource.title}»`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAddingLink ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={linkUrlId} className="text-xs font-medium text-foreground">
                Dirección
              </label>
              <Input
                id={linkUrlId}
                type="url"
                inputMode="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  // Enter agrega el enlace en vez de enviar el formulario de la cápsula.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLink();
                  }
                }}
                placeholder="https://…"
                aria-invalid={Boolean(linkError)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={linkTitleId} className="text-xs font-medium text-foreground">
                Nombre (opcional)
              </label>
              <Input
                id={linkTitleId}
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLink();
                  }
                }}
                placeholder="Ej.: Ficha del fabricante"
              />
            </div>
          </div>
          {linkError && (
            <p role="alert" className="text-xs text-destructive">
              {linkError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingLink(false);
                setLinkError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={addLink}>
              Agregar enlace
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => handleFiles(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFull || isReading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
            {isReading ? "Leyendo archivos…" : "Subir archivo"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isFull} onClick={() => setIsAddingLink(true)}>
            <Link2 />
            Agregar enlace
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {isFull && <p className="text-xs text-muted-foreground">Llegaste al máximo de {MAX_RESOURCES} materiales.</p>}
    </fieldset>
  );
}
