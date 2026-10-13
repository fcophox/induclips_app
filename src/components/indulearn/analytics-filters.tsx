"use client";

import { Info } from "lucide-react";

import { PERIODS, dealersOf, type Filters } from "@/lib/indulearn/analytics";
import type { AppState } from "@/lib/indulearn/types";

import { Select } from "./ui";

/** Fila de filtros compartida por el Dashboard y la pantalla de Indicadores. */
export function AnalyticsFilters({
  state,
  filters,
  onChange,
}: {
  state: AppState;
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const brands = state.brands.filter((brand) => brand.status === "active");
  const capsules = state.capsules.filter(
    (capsule) =>
      capsule.status === "published" && (filters.brandId === "all" || capsule.brandIds.includes(filters.brandId)),
  );

  function set(patch: Partial<Filters>) {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Marca
        <Select
          value={filters.brandId}
          // Cambiar de marca invalida la cápsula elegida: puede no ser de esa marca.
          onChange={(event) => set({ brandId: event.target.value, capsuleId: "all" })}
        >
          <option value="all">Todas las marcas</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Período
        <Select value={filters.days} onChange={(event) => set({ days: Number(event.target.value) })}>
          {PERIODS.map((period) => (
            <option key={period.days} value={period.days}>
              {period.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Concesionario
        <Select value={filters.dealer} onChange={(event) => set({ dealer: event.target.value })}>
          <option value="all">Todos</option>
          {dealersOf(state).map((dealer) => (
            <option key={dealer} value={dealer}>
              {dealer}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Cápsula
        <Select
          value={filters.capsuleId}
          onChange={(event) => set({ capsuleId: event.target.value })}
          className="lg:max-w-64"
        >
          <option value="all">Todas</option>
          {capsules.map((capsule) => (
            <option key={capsule.id} value={capsule.id}>
              {capsule.title}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}

/**
 * Aviso de lectura de los datos. Va en las dos pantallas de indicadores para
 * que nadie presente una reproducción como prueba de aprendizaje.
 */
export function MeasurementNote() {
  return (
    <p className="flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>
        <strong className="font-medium text-foreground">Cómo leer estos datos.</strong> Una reproducción indica que la
        cápsula se inició; una finalización, que se vio hasta el umbral configurado. Ambas miden consumo, no
        conocimiento adquirido. El historial es simulado para esta demostración.
      </span>
    </p>
  );
}
