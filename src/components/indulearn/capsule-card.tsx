"use client";

import Link from "next/link";
import { Cpu, Handshake, HeartHandshake, LayoutGrid, Play, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatDuration } from "@/lib/indulearn/format";
import { brandById, capsuleState, percentOf, progressOf } from "@/lib/indulearn/selectors";
import type { AppState, Capsule, Category } from "@/lib/indulearn/types";
import { cn } from "@/lib/utils";

import { BrandBadge, ProgressBar, StateBadge } from "./ui";

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  Seguridad: ShieldCheck,
  Tecnología: Cpu,
  Portafolio: LayoutGrid,
  Producto: Truck,
  "Técnicas de venta": Handshake,
  "Atención al cliente": HeartHandshake,
};

/**
 * Miniaturas generadas. El prototipo no tiene imágenes reales: cada cápsula
 * elige uno de estos fondos. Las clases van escritas completas para que
 * Tailwind las encuentre al compilar.
 */
export const THUMB_STYLES = [
  { name: "Azul", className: "from-blue-600 via-indigo-700 to-slate-900" },
  { name: "Cian", className: "from-sky-600 via-cyan-800 to-slate-900" },
  { name: "Verde", className: "from-emerald-600 via-teal-800 to-slate-900" },
  { name: "Ámbar", className: "from-amber-600 via-orange-700 to-slate-900" },
  { name: "Violeta", className: "from-violet-600 via-purple-800 to-slate-900" },
  { name: "Rosa", className: "from-rose-600 via-pink-800 to-slate-900" },
] as const;

export function thumbClass(index: number): string {
  return THUMB_STYLES[index % THUMB_STYLES.length]!.className;
}

/** Fondo ilustrado de una cápsula: lo comparten la miniatura y el reproductor. */
export function CapsuleArt({
  capsule,
  isAnimated = false,
  className,
}: {
  capsule: Pick<Capsule, "thumb" | "category" | "posterRef">;
  isAnimated?: boolean;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[capsule.category];

  if (capsule.posterRef) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden bg-slate-950", className)} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- portada local y fija; next/image no aporta aquí */}
        <img src={capsule.posterRef} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-gradient-to-br", thumbClass(capsule.thumb), className)} aria-hidden>
      <div
        className={cn(
          "absolute -right-[20%] -top-[10%] aspect-square w-[70%] rounded-full bg-white/15 blur-3xl",
          isAnimated && "animate-il-drift",
        )}
      />
      <div
        className={cn(
          "absolute -bottom-[15%] -left-[20%] aspect-square w-[60%] rounded-full bg-black/25 blur-3xl",
          isAnimated && "animate-il-drift [animation-delay:-4s]",
        )}
      />
      <Icon className="absolute left-1/2 top-1/2 size-[38%] -translate-x-1/2 -translate-y-1/2 text-white/15" strokeWidth={1} />
    </div>
  );
}

/**
 * Portada de una cápsula. Siempre vertical (9:16), como el propio video: una
 * portada apaisada prometería un formato que el reproductor no tiene.
 */
export function CapsuleThumb({
  capsule,
  hasDuration = true,
  className,
}: {
  capsule: Capsule;
  /** Se oculta en portadas muy pequeñas, donde la etiqueta taparía el dibujo. */
  hasDuration?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[9/16] overflow-hidden rounded-lg", className)}>
      <CapsuleArt capsule={capsule} />
      {hasDuration && (
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[11px] font-medium leading-none tabular-nums text-white">
          {formatDuration(capsule.durationSec)}
        </span>
      )}
    </div>
  );
}

export function capsuleHref(capsuleId: string): string {
  return `/indulearn/explorar?c=${encodeURIComponent(capsuleId)}`;
}

export function CapsuleCard({
  capsule,
  state,
  userId,
  className,
}: {
  capsule: Capsule;
  state: AppState;
  userId: string;
  className?: string;
}) {
  const progress = progressOf(state, userId, capsule.id);
  const status = capsuleState(progress);
  const percent = percentOf(progress, capsule);
  const action = status === "in_progress" ? "Continuar" : status === "completed" ? "Ver de nuevo" : "Reproducir";

  return (
    <Link
      href={capsuleHref(capsule.id)}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card outline-none transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      <div className="relative aspect-[9/16] overflow-hidden">
        <CapsuleArt capsule={capsule} />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full bg-white/95 text-slate-900 shadow-lg transition-transform group-hover:scale-105">
            <Play className="size-5 translate-x-0.5 fill-current" aria-hidden />
          </span>
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">
          {formatDuration(capsule.durationSec)}
        </span>
        {status === "in_progress" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
            <div className="h-full bg-white" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {capsule.brandIds.map((id) => {
            const brand = brandById(state, id);
            return brand ? <BrandBadge key={id} brand={brand} /> : null;
          })}
          <span className="text-xs text-muted-foreground">{capsule.category}</span>
        </div>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{capsule.title}</h3>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-1">
          <StateBadge state={status} />
          <span className="text-sm font-medium text-primary">
            {action}
            <span className="sr-only">: {capsule.title}</span>
          </span>
        </div>

        {status === "in_progress" && (
          <ProgressBar value={percent} label={`Avance de ${capsule.title}`} />
        )}
      </div>
    </Link>
  );
}
