"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Film, Play, UserCheck, Users } from "lucide-react";

import { AnalyticsFilters, MeasurementNote } from "@/components/indulearn/analytics-filters";
import {
  BrandConsumptionChart,
  ChartCard,
  TimelineChart,
  TopCapsulesChart,
  UsersByBrandChart,
} from "@/components/indulearn/charts";
import { PageHeader, ProgressBar, StatCard } from "@/components/indulearn/ui";
import { DEFAULT_FILTERS, summarize } from "@/lib/indulearn/analytics";
import { formatNumber } from "@/lib/indulearn/format";
import { useAppState } from "@/lib/indulearn/store";

export default function AdminDashboardPage() {
  const state = useAppState();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const summary = useMemo(() => summarize(state, filters), [state, filters]);
  const { kpis } = summary;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Seguimiento del consumo de cápsulas en la red comercial."
      />

      <AnalyticsFilters state={state} filters={filters} onChange={setFilters} />

      <section aria-label="Indicadores principales" className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <StatCard icon={Users} label="Colaboradores" value={formatNumber(kpis.collaborators)} />
        <StatCard
          icon={UserCheck}
          label="Usuarios activos"
          value={formatNumber(kpis.activeUsers)}
          hint="Con actividad en el período"
        />
        <StatCard icon={Film} label="Cápsulas publicadas" value={formatNumber(kpis.publishedCapsules)} />
        <StatCard icon={Play} label="Reproducciones" value={formatNumber(kpis.plays)} />
        <StatCard
          icon={CircleCheck}
          label="Tasa de finalización"
          value={`${kpis.completionRate} %`}
          hint={`${formatNumber(kpis.completions)} finalizaciones`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Evolución de reproducciones"
          description="Reproducciones iniciadas y finalizaciones en el período."
          className="lg:col-span-2"
        >
          <TimelineChart data={summary.timeline} />
        </ChartCard>

        <ChartCard title="Avance por marca" description="Cápsulas completadas sobre las asignadas a sus colaboradores.">
          <ul className="flex flex-col gap-4">
            {summary.progressByBrand.map(({ brand, percent, people }) => (
              <li key={brand.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: brand.colorVar }} aria-hidden />
                    <span className="truncate">{brand.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground">{percent} %</span>
                </div>
                <ProgressBar value={percent} label={`Avance de ${brand.name}`} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {people} {people === 1 ? "colaborador" : "colaboradores"}
                </p>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="Consumo por marca" description="Reproducciones y finalizaciones de cada marca.">
          <BrandConsumptionChart data={summary.byBrand} />
        </ChartCard>

        <ChartCard title="Cápsulas más vistas" description="Ordenadas por reproducciones.">
          <TopCapsulesChart data={summary.byCapsule} />
        </ChartCard>

        <ChartCard
          title="Usuarios por marca"
          description="Un colaborador multimarca cuenta en cada una de sus marcas."
        >
          <UsersByBrandChart data={summary.usersByBrand} />
        </ChartCard>
      </div>

      <MeasurementNote />
    </div>
  );
}
