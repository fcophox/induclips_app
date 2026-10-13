export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const DATE = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric" });
const SHORT_DATE = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });
const NUMBER = new Intl.NumberFormat("es-CL");

export function formatDate(iso: string | null): string {
  return iso ? DATE.format(new Date(iso)) : "—";
}

export function formatShortDate(iso: string): string {
  return SHORT_DATE.format(new Date(iso));
}

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  return formatDate(iso);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (first + second).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
