import { capsuleState, collaborators, progressOf } from "./selectors";
import type { AppState, Brand, User } from "./types";

/**
 * Indicadores del panel administrativo.
 *
 * El historial es SINTÉTICO: se genera de forma determinista a partir de las
 * cápsulas, marcas y colaboradores existentes, para que los gráficos tengan
 * forma sin un backend. A ese historial se le suma la actividad real de la
 * demo (lo que se reproduce en este navegador), de modo que completar una
 * cápsula mueve los números.
 *
 * En el MVP, `buildRecords` se sustituye por una consulta a la tabla de
 * eventos de reproducción; los agregados de `summarize` no cambian.
 */

export const PERIODS = [
  { days: 7, label: "Últimos 7 días" },
  { days: 30, label: "Últimos 30 días" },
  { days: 90, label: "Últimos 90 días" },
] as const;

const HISTORY_DAYS = 90;
const DAY_MS = 86_400_000;

export type Filters = {
  brandId: string;
  days: number;
  dealer: string;
  capsuleId: string;
};

export const DEFAULT_FILTERS: Filters = { brandId: "all", days: 30, dealer: "all", capsuleId: "all" };

type DailyRecord = {
  /** 0 = hoy, 1 = ayer… */
  daysAgo: number;
  capsuleId: string;
  brandId: string;
  dealer: string;
  plays: number;
  completions: number;
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Número pseudoaleatorio estable en [0, 1) para una clave dada. */
function noise(key: string): number {
  return hash(key) / 4294967296;
}

function daysBetween(iso: string, now: Date): number {
  return Math.floor((startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / DAY_MS);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildRecords(state: AppState, now: Date): DailyRecord[] {
  const records: DailyRecord[] = [];
  const people = collaborators(state).filter((user) => user.status === "active");

  for (const capsule of state.capsules) {
    if (capsule.status !== "published" || !capsule.publishedAt) continue;

    const age = Math.min(HISTORY_DAYS - 1, daysBetween(capsule.publishedAt, now));
    const completionRate = 0.55 + noise(`rate:${capsule.id}`) * 0.25;

    for (const brandId of capsule.brandIds) {
      const sellersByDealer = new Map<string, number>();
      for (const user of people) {
        if (user.brandIds.includes(brandId)) {
          sellersByDealer.set(user.dealer, (sellersByDealer.get(user.dealer) ?? 0) + 1);
        }
      }

      for (const [dealer, sellers] of sellersByDealer) {
        for (let daysAgo = age; daysAgo >= 1; daysAgo -= 1) {
          const date = new Date(now.getTime() - daysAgo * DAY_MS);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          // El interés decae tras la publicación y casi desaparece en fin de semana.
          const sinceLaunch = age - daysAgo;
          const decay = 0.35 + 0.65 * Math.exp(-sinceLaunch / 12);
          const expected = sellers * 1.6 * decay * (weekend ? 0.2 : 1);

          const key = `${capsule.id}:${brandId}:${dealer}:${daysAgo}`;
          const plays = Math.round(expected * (0.4 + noise(key) * 1.2));
          if (plays === 0) continue;

          const completions = Math.min(plays, Math.round(plays * (completionRate + (noise(`c:${key}`) - 0.5) * 0.2)));
          records.push({ daysAgo, capsuleId: capsule.id, brandId, dealer, plays, completions });
        }
      }
    }
  }

  // Actividad real de la demo.
  for (const user of collaborators(state)) {
    const entries = state.progress[user.id];
    if (!entries) continue;

    for (const [capsuleId, progress] of Object.entries(entries)) {
      const capsule = state.capsules.find((c) => c.id === capsuleId);
      if (!capsule) continue;
      const brandId = capsule.brandIds.find((id) => user.brandIds.includes(id)) ?? capsule.brandIds[0];
      if (!brandId) continue;

      const started = daysBetween(progress.startedAt, now);
      if (started >= 0 && started < HISTORY_DAYS) {
        records.push({ daysAgo: started, capsuleId, brandId, dealer: user.dealer, plays: 1, completions: 0 });
      }
      if (progress.completedAt) {
        const completed = daysBetween(progress.completedAt, now);
        if (completed >= 0 && completed < HISTORY_DAYS) {
          records.push({ daysAgo: completed, capsuleId, brandId, dealer: user.dealer, plays: 0, completions: 1 });
        }
      }
    }
  }

  return records;
}

export type Totals = { plays: number; completions: number };

export type Summary = {
  kpis: {
    collaborators: number;
    activeUsers: number;
    publishedCapsules: number;
    plays: number;
    completions: number;
    /** Finalizaciones sobre reproducciones, 0–100. */
    completionRate: number;
  };
  timeline: { label: string; plays: number; completions: number }[];
  byBrand: ({ brand: Brand } & Totals)[];
  byCapsule: ({ id: string; title: string; brandIds: string[]; rate: number } & Totals)[];
  byDealer: ({ dealer: string; collaborators: number; rate: number } & Totals)[];
  usersByBrand: { brand: Brand; count: number }[];
  /** Avance medio real de los colaboradores de cada marca, 0–100. */
  progressByBrand: { brand: Brand; percent: number; people: number }[];
};

function rate(totals: Totals): number {
  return totals.plays === 0 ? 0 : Math.min(100, Math.round((totals.completions / totals.plays) * 100));
}

function matchesPeople(user: User, filters: Filters): boolean {
  if (filters.brandId !== "all" && !user.brandIds.includes(filters.brandId)) return false;
  if (filters.dealer !== "all" && user.dealer !== filters.dealer) return false;
  return true;
}

const BUCKET_LABEL = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });

export function summarize(state: AppState, filters: Filters, now: Date = new Date()): Summary {
  const records = buildRecords(state, now).filter(
    (r) =>
      r.daysAgo < filters.days &&
      (filters.brandId === "all" || r.brandId === filters.brandId) &&
      (filters.dealer === "all" || r.dealer === filters.dealer) &&
      (filters.capsuleId === "all" || r.capsuleId === filters.capsuleId),
  );

  const people = collaborators(state).filter((user) => matchesPeople(user, filters));
  const activeBrands = state.brands.filter((brand) => brand.status === "active");
  const visibleBrands = activeBrands.filter((b) => filters.brandId === "all" || b.id === filters.brandId);

  const totals = records.reduce<Totals>(
    (acc, r) => ({ plays: acc.plays + r.plays, completions: acc.completions + r.completions }),
    { plays: 0, completions: 0 },
  );

  // 90 días se agrupan por semana: 90 puntos diarios no se leen en un móvil.
  const bucketSize = filters.days > 30 ? 7 : 1;
  const bucketCount = Math.ceil(filters.days / bucketSize);
  const timeline = Array.from({ length: bucketCount }, (_, i) => {
    const newest = (bucketCount - 1 - i) * bucketSize;
    const inBucket = records.filter((r) => r.daysAgo >= newest && r.daysAgo < newest + bucketSize);
    const date = new Date(now.getTime() - (newest + bucketSize - 1) * DAY_MS);
    return {
      label: BUCKET_LABEL.format(date),
      plays: inBucket.reduce((sum, r) => sum + r.plays, 0),
      completions: inBucket.reduce((sum, r) => sum + r.completions, 0),
    };
  });

  const sumWhere = (predicate: (r: DailyRecord) => boolean): Totals =>
    records.filter(predicate).reduce<Totals>(
      (acc, r) => ({ plays: acc.plays + r.plays, completions: acc.completions + r.completions }),
      { plays: 0, completions: 0 },
    );

  const published = state.capsules.filter(
    (c) =>
      c.status === "published" &&
      (filters.brandId === "all" || c.brandIds.includes(filters.brandId)) &&
      (filters.capsuleId === "all" || c.id === filters.capsuleId),
  );

  const byCapsule = published
    .map((capsule) => {
      const t = sumWhere((r) => r.capsuleId === capsule.id);
      return { id: capsule.id, title: capsule.title, brandIds: capsule.brandIds, ...t, rate: rate(t) };
    })
    .sort((a, b) => b.plays - a.plays);

  const dealers = [...new Set(people.map((user) => user.dealer))].sort();
  const byDealer = dealers.map((dealer) => {
    const t = sumWhere((r) => r.dealer === dealer);
    return {
      dealer,
      collaborators: people.filter((user) => user.dealer === dealer).length,
      ...t,
      rate: rate(t),
    };
  });

  const progressByBrand = visibleBrands.map((brand) => {
    const members = people.filter((user) => user.brandIds.includes(brand.id));
    const capsules = state.capsules.filter((c) => c.status === "published" && c.brandIds.includes(brand.id));
    const slots = members.length * capsules.length;
    let completed = 0;
    for (const user of members) {
      for (const capsule of capsules) {
        if (capsuleState(progressOf(state, user.id, capsule.id)) === "completed") completed += 1;
      }
    }
    return { brand, people: members.length, percent: slots === 0 ? 0 : Math.round((completed / slots) * 100) };
  });

  return {
    kpis: {
      collaborators: people.length,
      activeUsers: people.filter((u) => u.status === "active" && u.lastActiveDaysAgo < filters.days).length,
      publishedCapsules: published.length,
      plays: totals.plays,
      completions: totals.completions,
      completionRate: rate(totals),
    },
    timeline,
    byBrand: visibleBrands.map((brand) => ({ brand, ...sumWhere((r) => r.brandId === brand.id) })),
    byCapsule,
    byDealer,
    usersByBrand: visibleBrands.map((brand) => ({
      brand,
      count: people.filter((user) => user.brandIds.includes(brand.id)).length,
    })),
    progressByBrand,
  };
}

/** Reproducciones históricas de cada cápsula, para el listado del CMS. */
export function playsByCapsule(state: AppState, now: Date = new Date()): Map<string, number> {
  const result = new Map<string, number>();
  for (const record of buildRecords(state, now)) {
    result.set(record.capsuleId, (result.get(record.capsuleId) ?? 0) + record.plays);
  }
  return result;
}

export function dealersOf(state: AppState): string[] {
  return [...new Set(collaborators(state).map((user) => user.dealer))].sort();
}
