"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock3, History, Library, PartyPopper, Play, SearchX, TrendingUp } from "lucide-react";

import { CapsuleArt, CapsuleCard, CapsuleThumb, capsuleHref } from "@/components/indulearn/capsule-card";
import {
  Avatar,
  BrandBadge,
  Card,
  Carousel,
  EmptyState,
  FilterChips,
  ProgressBar,
  Select,
  StatCard,
  StateBadge,
} from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { firstName, formatDuration, formatRelative } from "@/lib/indulearn/format";
import {
  brandsForUser,
  capsuleState,
  capsuleToContinue,
  capsulesForUser,
  isSaved,
  learningSummary,
  percentOf,
  progressOf,
} from "@/lib/indulearn/selectors";
import { markCompleted, toast, useAppState, useCurrentUser } from "@/lib/indulearn/store";
import type { AppState, Brand, Capsule, User } from "@/lib/indulearn/types";
import { CATEGORIES } from "@/lib/indulearn/types";

type StatusFilter = "all" | "in_progress" | "pending" | "completed" | "saved";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "in_progress", label: "En curso" },
  { value: "pending", label: "Pendientes" },
  { value: "completed", label: "Completadas" },
  { value: "saved", label: "Guardadas" },
];

/**
 * Mi ruta reúne todo el avance del colaborador: qué seguir viendo, qué se le
 * recomienda, el estado de cada cápsula y lo que ya vio. El filtro de marca
 * de arriba aplica a toda la página.
 */
export default function MyRoutePage() {
  const state = useAppState();
  const user = useCurrentUser();
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  if (!user) return null;

  const brands = brandsForUser(state, user).filter((brand) => brand.status === "active");
  const capsules = capsulesForUser(state, user).filter(
    (capsule) => brandFilter === "all" || capsule.brandIds.includes(brandFilter),
  );
  const summary = learningSummary(state, user, capsules);
  const next = capsuleToContinue(state, user);
  const nextProgress = next ? progressOf(state, user.id, next.id) : null;

  const recommended = capsules.filter((capsule) => categoryFilter === "all" || capsule.category === categoryFilter);
  const categories = CATEGORIES.filter((category) => capsules.some((capsule) => capsule.category === category));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Te damos la bienvenida</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">Hola, {firstName(user.name)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Tus marcas:</span>
            {brands.map((brand) => (
              <BrandBadge key={brand.id} brand={brand} />
            ))}
          </div>
        </div>
        <Link
          href="/indulearn/perfil"
          aria-label="Ir a mi perfil"
          className="hidden rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:block"
        >
          <Avatar name={user.name} className="size-11 text-sm" />
        </Link>
      </header>

      {brands.length > 1 && (
        <FilterChips
          label="Filtrar por marca"
          className="-mt-4"
          value={brandFilter}
          onChange={(value) => {
            setBrandFilter(value);
            setCategoryFilter("all");
          }}
          options={[
            { value: "all", label: "Todas las marcas" },
            ...brands.map((brand) => ({ value: brand.id, label: brand.name, dot: brand.colorVar })),
          ]}
        />
      )}

      <section aria-label="Tu progreso" className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard icon={Library} label="Disponibles" value={String(summary.available)} hint="Cápsulas de tus marcas" />
          <StatCard icon={CircleCheck} label="Completadas" value={String(summary.completed)} />
          <StatCard icon={Clock3} label="Pendientes" value={String(summary.pending)} hint={`${summary.inProgress} en curso`} />
          <StatCard icon={TrendingUp} label="Avance" value={`${summary.percent} %`} />
        </div>
        <ProgressBar value={summary.percent} label="Progreso general" className="h-2" />
        <p className="text-xs text-muted-foreground">
          {summary.completed} de {summary.available} cápsulas completadas. Una cápsula se completa al ver el{" "}
          {state.settings.completionThreshold} % del video.
        </p>
      </section>

      <section aria-labelledby="continuar">
        <h2 id="continuar" className="text-base font-semibold text-foreground">
          Continuar aprendiendo
        </h2>
        {next ? (
          <Card className="mt-3 flex overflow-hidden">
            <div className="relative m-4 mr-0 aspect-[9/16] w-24 shrink-0 self-start overflow-hidden rounded-lg sm:m-5 sm:mr-0 sm:w-36">
              <CapsuleArt capsule={next} />
              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[11px] font-medium leading-none tabular-nums text-white">
                {formatDuration(next.durationSec)}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-1.5">
                {brands
                  .filter((brand) => next.brandIds.includes(brand.id))
                  .map((brand) => (
                    <BrandBadge key={brand.id} brand={brand} />
                  ))}
                <span className="text-xs text-muted-foreground">{next.category}</span>
                <StateBadge state={capsuleState(nextProgress)} className="ml-auto" />
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-snug text-foreground">{next.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{next.description}</p>
              </div>
              {nextProgress && (
                <div className="flex items-center gap-3">
                  <ProgressBar value={percentOf(nextProgress, next)} label={`Avance de ${next.title}`} />
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {percentOf(nextProgress, next)} %
                  </span>
                </div>
              )}
              <div className="mt-auto pt-1">
                <Button asChild>
                  <Link href={capsuleHref(next.id)}>
                    <Play className="fill-current" />
                    {nextProgress ? "Continuar" : "Comenzar"}
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={PartyPopper}
            title={capsules.length === 0 ? "Aún no hay cápsulas para tus marcas" : "Estás al día"}
            description={
              capsules.length === 0
                ? "Cuando se publique contenido para tus marcas aparecerá aquí."
                : "Completaste todas las cápsulas disponibles. Te avisaremos cuando haya contenido nuevo."
            }
            className="mt-3"
          />
        )}
      </section>

      <section aria-labelledby="recomendadas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="recomendadas" className="text-base font-semibold text-foreground">
            Cápsulas recomendadas
          </h2>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Categoría
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {recommended.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="No hay cápsulas que coincidan con los filtros elegidos."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setBrandFilter("all");
                  setCategoryFilter("all");
                }}
              >
                Limpiar filtros
              </Button>
            }
            className="mt-4"
          />
        ) : (
          <Carousel label="Cápsulas recomendadas" className="mt-4">
            {recommended.map((capsule) => (
              <CapsuleCard key={capsule.id} capsule={capsule} state={state} userId={user.id} />
            ))}
          </Carousel>
        )}
      </section>

      {/* Lado a lado sólo con ancho de sobra: más angosto, la fila de cada cápsula se comprime. */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start">
        <MyCapsules state={state} user={user} brands={brands} capsules={capsules} />
        <WatchHistory state={state} user={user} capsules={capsules} className="xl:sticky xl:top-8" />
      </div>
    </div>
  );
}

function MyCapsules({
  state,
  user,
  brands,
  capsules,
}: {
  state: AppState;
  user: User;
  brands: Brand[];
  capsules: Capsule[];
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const rows = capsules
    .map((capsule) => {
      const progress = progressOf(state, user.id, capsule.id);
      return { capsule, progress, status: capsuleState(progress), percent: percentOf(progress, capsule) };
    })
    .filter((row) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "saved") return isSaved(state, user.id, row.capsule.id);
      return row.status === statusFilter;
    });

  return (
    <section aria-labelledby="mis-capsulas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="mis-capsulas" className="text-base font-semibold text-foreground">
          Mis cápsulas
        </h2>
        <FilterChips label="Filtrar por estado" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nada por aquí"
          description="No hay cápsulas en este estado. Prueba con otro filtro."
          className="mt-4"
        />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map(({ capsule, progress, status, percent }) => (
            <li key={capsule.id}>
              <Card className="grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-3 p-4 sm:flex sm:items-center">
                <CapsuleThumb capsule={capsule} className="w-full shrink-0 self-start sm:w-24" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {brands
                      .filter((brand) => capsule.brandIds.includes(brand.id))
                      .map((brand) => (
                        <BrandBadge key={brand.id} brand={brand} />
                      ))}
                    <span className="text-xs text-muted-foreground">{capsule.category}</span>
                    <StateBadge state={status} />
                  </div>
                  <h3 className="mt-2 text-[15px] font-semibold leading-snug text-foreground">{capsule.title}</h3>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={percent} label={`Avance de ${capsule.title}`} />
                    <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                      {percent} %
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {progress ? `Última vez: ${formatRelative(progress.updatedAt).toLowerCase()}` : "Aún no la has visto"}
                  </p>
                </div>
                <div className="col-span-2 flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <Button asChild size="sm" variant={status === "completed" ? "outline" : "default"}>
                    <Link href={capsuleHref(capsule.id)}>
                      <Play className="fill-current" />
                      {status === "in_progress" ? "Continuar" : status === "completed" ? "Ver de nuevo" : "Comenzar"}
                    </Link>
                  </Button>
                  {status !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        markCompleted(user.id, capsule.id);
                        toast("Cápsula marcada como completada");
                      }}
                    >
                      <CircleCheck />
                      Marcar completada
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WatchHistory({
  state,
  user,
  capsules,
  className,
}: {
  state: AppState;
  user: User;
  capsules: Capsule[];
  className?: string;
}) {
  const history = capsules
    .map((capsule) => ({ capsule, progress: progressOf(state, user.id, capsule.id) }))
    .filter((item) => item.progress !== null)
    .sort((a, b) => b.progress!.updatedAt.localeCompare(a.progress!.updatedAt));

  return (
    <section aria-labelledby="historial" className={className}>
      <h2 id="historial" className="text-base font-semibold text-foreground">
        Historial de visualización
      </h2>
      {history.length === 0 ? (
        <EmptyState
          icon={History}
          title="Sin historial todavía"
          description="Cuando reproduzcas una cápsula, quedará registrada aquí."
          className="mt-4"
        />
      ) : (
        <Card className="mt-4 divide-y">
          {history.map(({ capsule, progress }) => (
            <div key={capsule.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={
                  progress!.completedAt
                    ? "grid size-8 shrink-0 place-items-center rounded-full bg-success-surface text-success-foreground"
                    : "grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                }
              >
                {progress!.completedAt ? <CircleCheck className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{capsule.title}</p>
                <p className="text-xs text-muted-foreground">
                  {progress!.completedAt ? "Completada" : `Vista al ${percentOf(progress, capsule)} %`}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(progress!.updatedAt)}</span>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
