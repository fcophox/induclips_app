"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Heart,
  Info,
  Link2,
  MessageCircle,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDuration, formatNumber } from "@/lib/indulearn/format";
import {
  brandsForUser,
  capsuleState,
  capsulesForUser,
  commentsOf,
  isLiked,
  isSaved,
  likesOf,
  percentOf,
  progressOf,
} from "@/lib/indulearn/selectors";
import { markCompleted, toast, toggleLike, toggleSaved, useAppState } from "@/lib/indulearn/store";
import type { Brand, Capsule, User } from "@/lib/indulearn/types";
import { cn } from "@/lib/utils";

import { CapsuleThumb, capsuleHref } from "./capsule-card";
import { CommentForm, CommentList, CommentsPanel } from "./capsule-comments";
import { CapsulePlayer, RailButton } from "./capsule-player";
import { EmptyState, FilterChips, Modal, ProgressBar, StateBadge } from "./ui";

/**
 * Feed vertical de cápsulas.
 *
 * Es una lista con `scroll-snap`: en móvil cada cápsula ocupa la pantalla y se
 * cambia deslizando; en escritorio la misma lista vive en una columna central
 * con formato 9:16 y la información pasa a un panel lateral. Un solo
 * mecanismo para los dos tamaños.
 *
 * Junto al video van las flechas de navegación, "me gusta", comentarios y
 * guardar. En pantallas anchas los comentarios se abren en una tarjeta pegada
 * a la derecha del video (al estilo de YouTube), sin ocultar el panel de
 * información; en móvil y escritorio angosto, en una hoja modal.
 */
export function CapsuleFeed({ user, initialCapsuleId }: { user: User; initialCapsuleId?: string }) {
  const state = useAppState();
  const [brandFilter, setBrandFilter] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  // Pantallas anchas: tarjeta entre el video y el panel de información. Móvil y
  // escritorio angosto, donde no cabe: hoja modal.
  const [commentsView, setCommentsView] = useState<"panel" | "sheet" | null>(null);
  // Abierta o cerrada para todo el feed: al pasar de cápsula se mantiene.
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const toggleInfo = useCallback(() => setIsInfoOpen((current) => !current), []);
  const closeInfo = useCallback(() => setIsInfoOpen(false), []);
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

  const closeComments = useCallback(() => setCommentsView(null), []);

  function changeBrand(next: string) {
    setBrandFilter(next);
    scrollerRef.current?.scrollTo({ top: 0 });
  }

  function save(capsule: Capsule) {
    const wasSaved = isSaved(state, user.id, capsule.id);
    toggleSaved(user.id, capsule.id);
    toast(wasSaved ? "Cápsula quitada de guardadas" : "Cápsula guardada", "info");
  }

  function toggleComments(capsule: Capsule) {
    if (!window.matchMedia("(min-width: 90rem)").matches) {
      setCommentsView("sheet");
      return;
    }
    setCommentsView((view) => (view === "panel" && active?.id === capsule.id ? null : "panel"));
  }

  function like(capsule: Capsule) {
    toggleLike(user.id, capsule.id);
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
            {capsules.map((capsule, index) => {
              const progress = progressOf(state, user.id, capsule.id);
              const saved = isSaved(state, user.id, capsule.id);
              const liked = isLiked(state, user.id, capsule.id);
              const likeCount = likesOf(state, capsule.id);
              const commentCount = commentsOf(state, capsule.id).length;
              return (
                <section
                  key={capsule.id}
                  data-capsule-id={capsule.id}
                  aria-label={capsule.title}
                  className={cn(
                    "@container flex h-full snap-start snap-always items-center justify-center lg:px-6 lg:pb-6",
                    brands.length > 1 ? "lg:pt-16" : "lg:pt-6",
                  )}
                >
                  {/* Video, acciones y comentarios forman un bloque centrado. Con
                      los comentarios abiertos, la altura se limita según el ancho
                      disponible para que el video conserve el 9:16 y no se aplaste. */}
                  <div
                    className={cn(
                      "flex h-full w-full items-end justify-center lg:w-auto",
                      commentsView === "panel" &&
                        "min-[90rem]:max-h-[calc((100cqw-400px)*16/9)] 2xl:max-h-[calc((100cqw-464px)*16/9)]",
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
                        isInfoOpen={isInfoOpen}
                        onCloseInfo={closeInfo}
                        infoButton={
                          <div className="lg:hidden">
                            <RailButton
                              label="Info"
                              isPressed={isInfoOpen}
                              onClick={toggleInfo}
                              ariaLabel={isInfoOpen ? "Ocultar información" : "Ver información"}
                            >
                              <Info className="size-5" />
                            </RailButton>
                          </div>
                        }
                        hasTopInset={brands.length > 1}
                        rail={
                          <div className="flex flex-col items-center gap-4 lg:hidden">
                            <RailButton
                              label={formatNumber(likeCount)}
                              isPressed={liked}
                              onClick={() => like(capsule)}
                              ariaLabel={liked ? "Quitar me gusta" : "Me gusta"}
                            >
                              <Heart className={cn("size-5", liked && "fill-current text-red-500")} />
                            </RailButton>
                            <RailButton
                              label={formatNumber(commentCount)}
                              onClick={() => setCommentsView("sheet")}
                              ariaLabel={`Ver ${commentCount} comentarios`}
                            >
                              <MessageCircle className="size-5" />
                            </RailButton>
                            <RailButton
                              label={saved ? "Guardada" : "Guardar"}
                              isPressed={saved}
                              onClick={() => save(capsule)}
                            >
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
                    {/* Columna junto al video: flechas centradas respecto del video
                        y, abajo, las acciones. */}
                    <div className="relative hidden h-full flex-col items-center justify-between pl-4 lg:flex">
                      <SideAction
                        label="Info"
                        ariaLabel={isInfoOpen ? "Ocultar información" : "Ver información"}
                        isPressed={isInfoOpen}
                        onClick={toggleInfo}
                      >
                        <Info className="size-5" />
                      </SideAction>
                      {capsules.length > 1 && (
                        <div className="absolute left-1/2 top-1/2 flex -translate-y-1/2 translate-x-[calc(-50%+8px)] flex-col gap-3">
                          <button
                            type="button"
                            aria-label="Cápsula anterior"
                            disabled={index === 0}
                            onClick={() => scrollToIndex(index - 1)}
                            className={cn(SIDE_CIRCLE, "hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50")}
                          >
                            <ChevronUp className="size-5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            aria-label="Cápsula siguiente"
                            disabled={index === capsules.length - 1}
                            onClick={() => scrollToIndex(index + 1)}
                            className={cn(SIDE_CIRCLE, "hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50")}
                          >
                            <ChevronDown className="size-5" aria-hidden />
                          </button>
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-5 pb-4">
                        <SideAction
                          label={formatNumber(likeCount)}
                          ariaLabel={liked ? "Quitar me gusta" : "Me gusta"}
                          isPressed={liked}
                          onClick={() => like(capsule)}
                        >
                          <Heart className={cn("size-5", liked && "fill-current text-red-500")} />
                        </SideAction>
                        <SideAction
                          label={formatNumber(commentCount)}
                          ariaLabel={`Comentarios (${commentCount})`}
                          isPressed={commentsView === "panel" && active?.id === capsule.id}
                          onClick={() => toggleComments(capsule)}
                        >
                          <MessageCircle className="size-5" />
                        </SideAction>
                        <SideAction
                          label={saved ? "Guardada" : "Guardar"}
                          isPressed={saved}
                          onClick={() => save(capsule)}
                        >
                          {saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
                        </SideAction>
                      </div>
                    </div>
                    {/* Con los comentarios abiertos, todas las cápsulas reservan el
                      hueco: así el video no salta de lugar al pasar a la siguiente. */}
                    {commentsView === "panel" && (
                      <div className="hidden h-full w-[336px] shrink-0 pl-4 min-[90rem]:block 2xl:w-[400px]">
                        {active?.id === capsule.id && (
                          <CommentsPanel
                            capsuleId={capsule.id}
                            user={user}
                            onClose={closeComments}
                            className="animate-il-panel-in h-full"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Posición en el feed, para lectores de pantalla. */}
        <p className="sr-only" aria-live="polite">
          {active ? `Cápsula ${activeIndex + 1} de ${capsules.length}: ${active.title}` : ""}
        </p>
      </div>

      <aside className="hidden w-[320px] shrink-0 flex-col overflow-y-auto border-l bg-card lg:flex 2xl:w-[380px]">
        {isBlocked && (
          <p className="border-b bg-warn-surface px-6 py-3 text-sm text-foreground">
            El enlace apunta a una cápsula de una marca para la que no tienes autorización.
          </p>
        )}

        {active ? (
          <>
            {/* Marcas, categoría, título y descripción se ven con el botón "Info" del video. */}
            <div className="flex flex-col gap-4 p-6">
              <h1 className="sr-only">{active.title}</h1>
              {renderProgress(active)}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => save(active)}
                  aria-pressed={isSaved(state, user.id, active.id)}
                >
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
                      <CapsuleThumb capsule={capsule} className="w-14 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                          {capsule.title}
                        </span>
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
            <Link href="/indulearn/mi-ruta" className="font-medium text-primary underline-offset-4 hover:underline">
              Ir a mi ruta
            </Link>
          </div>
        )}
      </aside>

      {active && (
        <Modal
          isOpen={commentsView === "sheet"}
          onClose={closeComments}
          title={`Comentarios (${commentsOf(state, active.id).length})`}
          footer={<CommentForm capsuleId={active.id} user={user} />}
        >
          <CommentList capsuleId={active.id} user={user} />
        </Modal>
      )}
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

/** Círculo común a las flechas y las acciones junto al video en escritorio. */
const SIDE_CIRCLE =
  "grid size-12 place-items-center rounded-full border bg-card text-foreground shadow-xs outline-none transition-colors disabled:pointer-events-none disabled:opacity-40";

/** Acción junto al video en escritorio: botón redondo con su contador debajo. */
function SideAction({
  label,
  ariaLabel,
  isPressed,
  onClick,
  children,
}: {
  label: string;
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
      className="group flex flex-col items-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground outline-none"
    >
      <span
        className={cn(
          SIDE_CIRCLE,
          "group-hover:bg-accent group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50",
          isPressed && "bg-accent",
        )}
      >
        {children}
      </span>
      <span aria-hidden={ariaLabel ? true : undefined}>{label}</span>
    </button>
  );
}

function brandsOf(capsule: Capsule, brands: Brand[]): Brand[] {
  return brands.filter((brand) => capsule.brandIds.includes(brand.id));
}
