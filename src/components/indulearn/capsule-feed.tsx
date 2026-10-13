"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, CircleCheck, Link2, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/indulearn/format";
import {
  brandsForUser,
  capsuleState,
  capsulesForUser,
  isSaved,
  percentOf,
  progressOf,
} from "@/lib/indulearn/selectors";
import { markCompleted, toast, toggleSaved, useAppState } from "@/lib/indulearn/store";
import type { Brand, Capsule, User } from "@/lib/indulearn/types";
import { cn } from "@/lib/utils";

import { CapsuleThumb, capsuleHref } from "./capsule-card";
import { CapsulePlayer, RailButton } from "./capsule-player";
import { BrandBadge, EmptyState, FilterChips, ProgressBar, StateBadge } from "./ui";

/**
 * Feed vertical de cápsulas.
 *
 * Es una lista con `scroll-snap`: en móvil cada cápsula ocupa la pantalla y se
 * cambia deslizando; en escritorio la misma lista vive en una columna central
 * con formato 9:16 y la información pasa a un panel lateral. Un solo
 * mecanismo para los dos tamaños.
 *
 * Deliberadamente sin "me gusta" ni comentarios: es consumo de conocimiento,
 * no una red social.
 */
export function CapsuleFeed({ user, initialCapsuleId }: { user: User; initialCapsuleId?: string }) {
  const state = useAppState();
  const [brandFilter, setBrandFilter] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  const allowed = useMemo(() => capsulesForUser(state, user), [state, user]);
  const capsules = useMemo(
    () => (brandFilter === "all" ? allowed : allowed.filter((c) => c.brandIds.includes(brandFilter))),
    [allowed, brandFilter],
  );
  const brands = brandsForUser(state, user).filter((brand) => brand.status === "active");

  // Enlace a una cápsula que existe pero no es de sus marcas.
  const isBlocked =
    initialCapsuleId !== undefined &&
    !allowed.some((c) => c.id === initialCapsuleId) &&
    state.capsules.some((c) => c.id === initialCapsuleId);

  useEffect(() => {
    if (isBlocked) toast("Ese enlace es de una marca para la que no tienes autorización.", "info");
  }, [isBlocked]);

  const activeIndex = Math.max(0, capsules.findIndex((c) => c.id === activeId));
  const active = capsules[activeIndex] ?? null;

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const item = scrollerRef.current?.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ behavior, block: "start" });
  }, []);

  // La cápsula "activa" es la que ocupa la mayor parte del visor.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId((entry.target as HTMLElement).dataset.capsuleId ?? null);
        }
      },
      { root: scroller, threshold: 0.6 },
    );
    Array.from(scroller.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [capsules]);

  // Llegada desde una tarjeta (`?c=`): se abre directamente en esa cápsula.
  useEffect(() => {
    if (didInitialScroll.current || capsules.length === 0) return;
    didInitialScroll.current = true;
    const index = initialCapsuleId ? capsules.findIndex((c) => c.id === initialCapsuleId) : -1;
    if (index > 0) scrollToIndex(index, "auto");
  }, [capsules, initialCapsuleId, scrollToIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        scrollToIndex(Math.min(capsules.length - 1, activeIndex + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        scrollToIndex(Math.max(0, activeIndex - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, capsules.length, scrollToIndex]);

  function changeBrand(next: string) {
    setBrandFilter(next);
    scrollerRef.current?.scrollTo({ top: 0 });
  }

  function save(capsule: Capsule) {
    const wasSaved = isSaved(state, user.id, capsule.id);
    toggleSaved(user.id, capsule.id);
    toast(wasSaved ? "Cápsula quitada de guardadas" : "Cápsula guardada", "info");
  }

  async function share(capsule: Capsule) {
    const url = `${window.location.origin}${capsuleHref(capsule.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado. Sólo lo verán colaboradores con acceso a la marca.", "info");
    } catch {
      toast("No se pudo copiar el enlace", "error");
    }
  }

  function complete(capsule: Capsule) {
    markCompleted(user.id, capsule.id);
    toast("Cápsula marcada como completada");
  }

  const filterOptions = [
    { value: "all", label: "Todas" },
    ...brands.map((brand) => ({ value: brand.id, label: brand.name, dot: brand.colorVar })),
  ];

  return (
    <div className="flex h-[calc(100dvh-4rem)] lg:h-dvh">
      <div className="relative min-w-0 flex-1 bg-slate-950 lg:bg-background">
        {brands.length > 1 && (
          <div className="absolute inset-x-0 top-0 z-40 px-3 pt-2 lg:px-6 lg:pt-4">
            <FilterChips label="Filtrar por marca" options={filterOptions} value={brandFilter} onChange={changeBrand} />
          </div>
        )}

        {capsules.length === 0 ? (
          <div className="grid h-full place-items-center p-6">
            <EmptyState
              icon={SearchX}
              title="No hay cápsulas para mostrar"
              description="Todavía no hay contenido publicado para tus marcas con este filtro."
              action={
                brandFilter !== "all" ? (
                  <Button variant="outline" onClick={() => changeBrand("all")}>
                    Ver todas las marcas
                  </Button>
                ) : undefined
              }
              className="w-full max-w-md"
            />
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="il-no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
          >
            {capsules.map((capsule) => {
              const progress = progressOf(state, user.id, capsule.id);
              const saved = isSaved(state, user.id, capsule.id);
              return (
                <section
                  key={capsule.id}
                  data-capsule-id={capsule.id}
                  aria-label={capsule.title}
                  className={cn(
                    "flex h-full snap-start snap-always items-center justify-center lg:px-6 lg:pb-6",
                    brands.length > 1 ? "lg:pt-16" : "lg:pt-6",
                  )}
                >
                  <div className="h-full w-full lg:aspect-[9/16] lg:w-auto lg:overflow-hidden lg:rounded-2xl lg:shadow-xl">
                    <CapsulePlayer
                      capsule={capsule}
                      userId={user.id}
                      brands={brandsOf(capsule, state.brands)}
                      settings={state.settings}
                      isActive={active?.id === capsule.id}
                      resumeAt={progress && !progress.completedAt ? progress.seconds : 0}
                      isCompleted={Boolean(progress?.completedAt)}
                      hasOverlayInfo
                      hasTopInset={brands.length > 1}
                      rail={
                        <div className="flex flex-col items-center gap-4 lg:hidden">
                          <RailButton label={saved ? "Guardada" : "Guardar"} isPressed={saved} onClick={() => save(capsule)}>
                            {saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
                          </RailButton>
                          {state.settings.allowShare && (
                            <RailButton label="Compartir" onClick={() => share(capsule)}>
                              <Link2 className="size-5" />
                            </RailButton>
                          )}
                          {!progress?.completedAt && (
                            <RailButton label="Completar" onClick={() => complete(capsule)}>
                              <CircleCheck className="size-5" />
                            </RailButton>
                          )}
                        </div>
                      }
                    />
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {capsules.length > 1 && (
          <div className="absolute right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
            <Button
              variant="outline"
              size="icon"
              aria-label="Cápsula anterior"
              disabled={activeIndex === 0}
              onClick={() => scrollToIndex(activeIndex - 1)}
            >
              <ChevronUp />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Cápsula siguiente"
              disabled={activeIndex === capsules.length - 1}
              onClick={() => scrollToIndex(activeIndex + 1)}
            >
              <ChevronDown />
            </Button>
          </div>
        )}

        {/* Posición en el feed, para lectores de pantalla. */}
        <p className="sr-only" aria-live="polite">
          {active ? `Cápsula ${activeIndex + 1} de ${capsules.length}: ${active.title}` : ""}
        </p>
      </div>

      <aside className="hidden w-[380px] shrink-0 flex-col overflow-y-auto border-l bg-card lg:flex">
        {isBlocked && (
          <p className="border-b bg-warn-surface px-6 py-3 text-sm text-foreground">
            El enlace apunta a una cápsula de una marca para la que no tienes autorización.
          </p>
        )}

        {active ? (
          <>
            <div className="flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-center gap-1.5">
                {brandsOf(active, state.brands).map((brand) => (
                  <BrandBadge key={brand.id} brand={brand} />
                ))}
                <span className="text-xs text-muted-foreground">{active.category}</span>
              </div>

              <div>
                <h1 className="text-lg font-semibold leading-snug text-foreground">{active.title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{active.description}</p>
              </div>

              {renderProgress(active)}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => save(active)} aria-pressed={isSaved(state, user.id, active.id)}>
                  {isSaved(state, user.id, active.id) ? <BookmarkCheck /> : <Bookmark />}
                  {isSaved(state, user.id, active.id) ? "Guardada" : "Guardar"}
                </Button>
                {state.settings.allowShare && (
                  <Button variant="outline" size="sm" onClick={() => share(active)}>
                    <Link2 />
                    Compartir enlace
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t p-6">
              <h2 className="text-sm font-semibold text-foreground">Más cápsulas</h2>
              <ul className="mt-3 flex flex-col gap-1">
                {capsules.map((capsule, index) => (
                  <li key={capsule.id}>
                    <button
                      type="button"
                      onClick={() => scrollToIndex(index)}
                      aria-current={capsule.id === active.id ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        capsule.id === active.id && "bg-accent",
                      )}
                    >
                      <CapsuleThumb capsule={capsule} className="w-24 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{capsule.title}</span>
                        <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {brandsOf(capsule, state.brands)
                            .map((brand) => brand.name)
                            .join(" · ")}
                          <span aria-hidden>·</span>
                          {formatDuration(capsule.durationSec)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            Sin cápsulas con este filtro.{" "}
            <Link href="/indulearn/inicio" className="font-medium text-primary underline-offset-4 hover:underline">
              Volver al inicio
            </Link>
          </div>
        )}
      </aside>
    </div>
  );

  function renderProgress(capsule: Capsule) {
    const progress = progressOf(state, user.id, capsule.id);
    const status = capsuleState(progress);
    const percent = percentOf(progress, capsule);

    return (
      <div className="rounded-xl border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <StateBadge state={status} />
          <span className="text-sm font-medium tabular-nums text-foreground">{percent} %</span>
        </div>
        <ProgressBar value={percent} label={`Avance de ${capsule.title}`} className="mt-3" />
        <p className="mt-3 text-xs text-muted-foreground">
          Se registra como completada al ver el {state.settings.completionThreshold} % del video.
        </p>
        {status !== "completed" && (
          <Button size="sm" className="mt-3 w-full" onClick={() => complete(capsule)}>
            <CircleCheck />
            Marcar como completada
          </Button>
        )}
      </div>
    );
  }
}

function brandsOf(capsule: Capsule, brands: Brand[]): Brand[] {
  return brands.filter((brand) => capsule.brandIds.includes(brand.id));
}
