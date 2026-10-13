"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock3, Library, PartyPopper, Play, SearchX, TrendingUp } from "lucide-react";

import { CapsuleArt, CapsuleCard, capsuleHref } from "@/components/indulearn/capsule-card";
import {
  Avatar,
  BrandBadge,
  Card,
  EmptyState,
  FilterChips,
  ProgressBar,
  Select,
  StatCard,
  StateBadge,
} from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { firstName, formatDuration } from "@/lib/indulearn/format";
import {
  brandsForUser,
  capsuleState,
  capsuleToContinue,
  capsulesForUser,
  learningSummary,
  percentOf,
  progressOf,
} from "@/lib/indulearn/selectors";
import { useAppState, useCurrentUser } from "@/lib/indulearn/store";
import { CATEGORIES } from "@/lib/indulearn/types";

export default function HomePage() {
  const state = useAppState();
  const user = useCurrentUser();
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  if (!user) return null;

  const brands = brandsForUser(state, user).filter((brand) => brand.status === "active");
  const capsules = capsulesForUser(state, user);
  const summary = learningSummary(state, user, capsules);
  const next = capsuleToContinue(state, user);
  const nextProgress = next ? progressOf(state, user.id, next.id) : null;

  const filtered = capsules.filter(
    (capsule) =>
      (brandFilter === "all" || capsule.brandIds.includes(brandFilter)) &&
      (categoryFilter === "all" || capsule.category === categoryFilter),
  );
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

      <section aria-label="Tu progreso" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard icon={Library} label="Disponibles" value={String(summary.available)} hint="Cápsulas de tus marcas" />
        <StatCard icon={CircleCheck} label="Completadas" value={String(summary.completed)} />
        <StatCard icon={Clock3} label="Pendientes" value={String(summary.pending)} hint={`${summary.inProgress} en curso`} />
        <StatCard icon={TrendingUp} label="Avance" value={`${summary.percent} %`} />
      </section>

      <section aria-labelledby="continuar">
        <h2 id="continuar" className="text-base font-semibold text-foreground">
          Continuar aprendiendo
        </h2>
        {next ? (
          <Card className="mt-3 flex flex-col overflow-hidden sm:flex-row">
            <div className="relative aspect-video sm:aspect-auto sm:w-72 sm:shrink-0">
              <CapsuleArt capsule={next} />
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">
                {formatDuration(next.durationSec)}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
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

        {brands.length > 1 && (
          <FilterChips
            label="Filtrar por marca"
            className="mt-3"
            value={brandFilter}
            onChange={setBrandFilter}
            options={[
              { value: "all", label: "Todas las marcas" },
              ...brands.map((brand) => ({ value: brand.id, label: brand.name, dot: brand.colorVar })),
            ]}
          />
        )}

        {filtered.length === 0 ? (
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
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((capsule) => (
              <CapsuleCard key={capsule.id} capsule={capsule} state={state} userId={user.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
