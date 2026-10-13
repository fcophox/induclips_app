"use client";

import { useMemo, useState } from "react";

import { AnalyticsFilters, MeasurementNote } from "@/components/indulearn/analytics-filters";
import { BrandBadge, Card, PageHeader } from "@/components/indulearn/ui";
import { DEFAULT_FILTERS, summarize } from "@/lib/indulearn/analytics";
import { formatNumber } from "@/lib/indulearn/format";
import { useAppState } from "@/lib/indulearn/store";

const TH = "px-4 py-2.5 text-left text-xs font-medium text-muted-foreground";
const TH_NUM = "px-4 py-2.5 text-right text-xs font-medium text-muted-foreground";
const TD = "px-4 py-3 text-sm text-foreground";
const TD_NUM = "px-4 py-3 text-right text-sm tabular-nums text-foreground";

function TableCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pb-3 pt-5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-t">{children}</table>
      </div>
    </Card>
  );
}

export default function IndicatorsPage() {
  const state = useAppState();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const summary = useMemo(() => summarize(state, filters), [state, filters]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Indicadores"
        description="El detalle en tablas de lo que muestra el dashboard: por cápsula, por marca y por concesionario."
      />

      <AnalyticsFilters state={state} filters={filters} onChange={setFilters} />
      <MeasurementNote />

      <TableCard title="Por cápsula" description="Consumo de cada cápsula publicada en el período.">
        <thead>
          <tr className="border-b bg-muted/40">
            <th scope="col" className={TH}>Cápsula</th>
            <th scope="col" className={TH}>Marcas</th>
            <th scope="col" className={TH_NUM}>Reproducciones</th>
            <th scope="col" className={TH_NUM}>Finalizaciones</th>
            <th scope="col" className={TH_NUM}>Tasa de finalización</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {summary.byCapsule.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No hay cápsulas publicadas con estos filtros.
              </td>
            </tr>
          )}
          {summary.byCapsule.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={`${TD} max-w-xs text-left font-medium`}>{row.title}</th>
              <td className={TD}>
                <span className="flex flex-wrap gap-1.5">
                  {state.brands
                    .filter((brand) => row.brandIds.includes(brand.id))
                    .map((brand) => (
                      <BrandBadge key={brand.id} brand={brand} />
                    ))}
                </span>
              </td>
              <td className={TD_NUM}>{formatNumber(row.plays)}</td>
              <td className={TD_NUM}>{formatNumber(row.completions)}</td>
              <td className={TD_NUM}>{row.plays === 0 ? "—" : `${row.rate} %`}</td>
            </tr>
          ))}
        </tbody>
      </TableCard>

      <TableCard title="Por marca" description="Colaboradores, consumo y avance de cada marca.">
        <thead>
          <tr className="border-b bg-muted/40">
            <th scope="col" className={TH}>Marca</th>
            <th scope="col" className={TH_NUM}>Colaboradores</th>
            <th scope="col" className={TH_NUM}>Reproducciones</th>
            <th scope="col" className={TH_NUM}>Finalizaciones</th>
            <th scope="col" className={TH_NUM}>Avance medio</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {summary.byBrand.map((row) => {
            const progress = summary.progressByBrand.find((item) => item.brand.id === row.brand.id);
            return (
              <tr key={row.brand.id}>
                <th scope="row" className={`${TD} text-left font-normal`}>
                  <BrandBadge brand={row.brand} />
                </th>
                <td className={TD_NUM}>{progress?.people ?? 0}</td>
                <td className={TD_NUM}>{formatNumber(row.plays)}</td>
                <td className={TD_NUM}>{formatNumber(row.completions)}</td>
                <td className={TD_NUM}>{progress?.percent ?? 0} %</td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>

      <TableCard title="Por concesionario" description="Participación de cada punto de la red.">
        <thead>
          <tr className="border-b bg-muted/40">
            <th scope="col" className={TH}>Concesionario</th>
            <th scope="col" className={TH_NUM}>Colaboradores</th>
            <th scope="col" className={TH_NUM}>Reproducciones</th>
            <th scope="col" className={TH_NUM}>Finalizaciones</th>
            <th scope="col" className={TH_NUM}>Tasa de finalización</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {summary.byDealer.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                Ningún concesionario coincide con estos filtros.
              </td>
            </tr>
          )}
          {summary.byDealer.map((row) => (
            <tr key={row.dealer}>
              <th scope="row" className={`${TD} text-left font-medium`}>{row.dealer}</th>
              <td className={TD_NUM}>{row.collaborators}</td>
              <td className={TD_NUM}>{formatNumber(row.plays)}</td>
              <td className={TD_NUM}>{formatNumber(row.completions)}</td>
              <td className={TD_NUM}>{row.plays === 0 ? "—" : `${row.rate} %`}</td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  );
}
