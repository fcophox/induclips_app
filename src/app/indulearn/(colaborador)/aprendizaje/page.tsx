"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, History, Play, SearchX } from "lucide-react";

import { CapsuleThumb, capsuleHref } from "@/components/indulearn/capsule-card";
import {
  BrandBadge,
  Card,
  EmptyState,
  FilterChips,
  PageHeader,
  ProgressBar,
  StateBadge,
} from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/indulearn/format";
import {
  brandsForUser,
  capsuleState,
  capsulesForUser,
  isSaved,
  learningSummary,
  percentOf,
  progressOf,
} from "@/lib/indulearn/selectors";
import { markCompleted, toast, useAppState, useCurrentUser } from "@/lib/indulearn/store";

type StatusFilter = "all" | "in_progress" | "pending" | "completed" | "saved";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "in_progress", label: "En curso" },
  { value: "pending", label: "Pendientes" },
  { value: "completed", label: "Completadas" },
  { value: "saved", label: "Guardadas" },
];

export default function LearningPage() {
  const state = useAppState();
  const user = useCurrentUser();
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  if (!user) return null;

  const brands = brandsForUser(state, user).filter((brand) => brand.status === "active");
  const byBrand = capsulesForUser(state, user).filter(
    (capsule) => brandFilter === "all" || capsule.brandIds.includes(brandFilter),
  );
  const summary = learningSummary(state, user, byBrand);

  const rows = byBrand
    .map((capsule) => {
      const progress = progressOf(state, user.id, capsule.id);
      return { capsule, progress, status: capsuleState(progress), percent: percentOf(progress, capsule) };
    })
    .filter((row) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "saved") return isSaved(state, user.id, row.capsule.id);
      return row.status === statusFilter;
    });

  const history = byBrand
    .map((capsule) => ({ capsule, progress: progressOf(state, user.id, capsule.id) }))
    .filter((item) => item.progress !== null)
    .sort((a, b) => b.progress!.updatedAt.localeCompare(a.progress!.updatedAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi aprendizaje" description="Tu avance en las cápsulas de las marcas que representas." />

      {brands.length > 1 && (
        <FilterChips
          label="Filtrar por marca"
          value={brandFilter}
          onChange={setBrandFilter}
          options={[
            { value: "all", label: "Todas las marcas" },
            ...brands.map((brand) => ({ value: brand.id, label: brand.name, dot: brand.colorVar })),
          ]}
        />
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Progreso general</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-foreground">{summary.percent} %</p>
          </div>
          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-muted-foreground">Completadas</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{summary.completed}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">En curso</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{summary.inProgress}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pendientes</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{summary.pending}</dd>
            </div>
          </dl>
        </div>
        <ProgressBar value={summary.percent} label="Progreso general" className="mt-4 h-2" />
        <p className="mt-3 text-xs text-muted-foreground">
          {summary.completed} de {summary.available} cápsulas completadas. Una cápsula se completa al ver el{" "}
          {state.settings.completionThreshold} % del video.
        </p>
      </Card>

      <section aria-labelledby="capsulas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="capsulas" className="text-base font-semibold text-foreground">
            Cápsulas
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

      <section aria-labelledby="historial">
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
    </div>
  );
}
