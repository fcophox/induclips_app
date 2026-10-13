"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Summary } from "@/lib/indulearn/analytics";
import { formatNumber } from "@/lib/indulearn/format";

import { Card } from "./ui";

/**
 * Gráficos del panel administrativo.
 *
 * Dos medidas, dos colores fijos en todos los gráficos: reproducciones
 * (serie 1) y finalizaciones (serie 2). El color sigue a la medida, nunca a
 * su posición, y el texto va siempre en tinta de texto, no en el color de la
 * serie. Los valores exactos están también en las tablas de Indicadores.
 */
const PLAYS = { key: "plays", name: "Reproducciones", color: "var(--chart-1)" } as const;
const COMPLETIONS = { key: "completions", name: "Finalizaciones", color: "var(--chart-2)" } as const;

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

type TooltipEntry = { name?: string | number; value?: number | string; color?: string };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && <p className="mb-1.5 font-semibold text-foreground">{label}</p>}
      <ul className="flex flex-col gap-1">
        {payload.map((entry) => (
          <li key={String(entry.name)} className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
            {entry.name}
            <span className="ml-auto pl-4 font-semibold tabular-nums text-foreground">
              {formatNumber(Number(entry.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function legendText(value: string) {
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

export function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="px-5 pt-5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="p-5 pt-4">{children}</div>
    </Card>
  );
}

function NoData() {
  return (
    <p className="grid h-56 place-items-center text-sm text-muted-foreground">
      Sin actividad con los filtros seleccionados.
    </p>
  );
}

export function TimelineChart({ data }: { data: Summary["timeline"] }) {
  if (data.every((point) => point.plays === 0 && point.completions === 0)) return <NoData />;

  return (
    <div className="h-64" role="img" aria-label="Evolución de reproducciones y finalizaciones en el período">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
          <Legend iconType="circle" iconSize={8} formatter={legendText} itemSorter={null} />
          <Line
            type="monotone"
            dataKey={PLAYS.key}
            name={PLAYS.name}
            stroke={PLAYS.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey={COMPLETIONS.key}
            name={COMPLETIONS.name}
            stroke={COMPLETIONS.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BrandConsumptionChart({ data }: { data: Summary["byBrand"] }) {
  const rows = data.map((item) => ({ name: item.brand.name, plays: item.plays, completions: item.completions }));
  if (rows.every((row) => row.plays === 0)) return <NoData />;

  return (
    <div className="h-64" role="img" aria-label="Reproducciones y finalizaciones por marca">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
          <Legend iconType="circle" iconSize={8} formatter={legendText} itemSorter={null} />
          <Bar dataKey={PLAYS.key} name={PLAYS.name} fill={PLAYS.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey={COMPLETIONS.key} name={COMPLETIONS.name} fill={COMPLETIONS.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopCapsulesChart({ data }: { data: Summary["byCapsule"] }) {
  const rows = data.filter((item) => item.plays > 0).slice(0, 6);
  if (rows.length === 0) return <NoData />;

  return (
    <div style={{ height: Math.max(160, rows.length * 44) }} role="img" aria-label="Cápsulas con más reproducciones">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="title"
            width={170}
            tickLine={false}
            axisLine={false}
            tick={{ ...AXIS_TICK, fill: "var(--foreground)" }}
            tickFormatter={(value: string) => (value.length > 24 ? `${value.slice(0, 23)}…` : value)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
          <Bar dataKey={PLAYS.key} name={PLAYS.name} fill={PLAYS.color} radius={[0, 4, 4, 0]} maxBarSize={18}>
            <LabelList
              dataKey={PLAYS.key}
              position="right"
              formatter={(value: unknown) => formatNumber(Number(value))}
              style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UsersByBrandChart({ data }: { data: Summary["usersByBrand"] }) {
  const rows = data.map((item) => ({ name: item.brand.name, count: item.count, color: item.brand.colorVar }));
  if (rows.every((row) => row.count === 0)) return <NoData />;

  return (
    <div className="h-56" role="img" aria-label="Colaboradores por marca">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: -16 }} barCategoryGap="32%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
          <Bar dataKey="count" name="Colaboradores" radius={[4, 4, 0, 0]} maxBarSize={44}>
            {rows.map((row) => (
              <Cell key={row.name} fill={row.color} />
            ))}
            <LabelList dataKey="count" position="top" style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
