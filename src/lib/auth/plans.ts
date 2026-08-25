import type { TenantLimits } from "@/lib/limits";

/**
 * Catálogo comercial de planes.
 *
 * Vive en el código y no en una tabla a propósito: los planes cambian con el
 * despliegue, no en caliente, y tenerlos aquí hace que un cambio de precios
 * pase por revisión de código. Los límites REALES de cada espacio están en
 * `tenants.limits`, ajustables caso por caso — un cliente grande puede tener
 * PRO con el doble de almacenamiento sin inventar un plan nuevo.
 *
 * Al añadir una dimensión a `TenantLimits`, añádela también a los tres planes:
 * `asLimits` rellenaría el hueco con su valor por defecto y un ENTERPRISE
 * heredaría en silencio el cupo de un FREE.
 */

export type TenantPlan = "FREE" | "PRO" | "ENTERPRISE";

export const PLANS: Record<TenantPlan, { label: string; limits: TenantLimits }> = {
  FREE: {
    label: "Free",
    limits: { maxUsers: 3, maxStorageMb: 1024 },
  },
  PRO: {
    label: "Pro",
    limits: { maxUsers: 10, maxStorageMb: 20480 },
  },
  ENTERPRISE: {
    label: "Enterprise",
    limits: { maxUsers: 100, maxStorageMb: 512000 },
  },
};

export const TENANT_STATUSES = ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const STATUS_LABELS: Record<TenantStatus, string> = {
  TRIAL: "Prueba",
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  CANCELLED: "Cancelado",
};

/** Un espacio fuera de estos estados no puede acceder al panel. */
export function isOperational(status: TenantStatus): boolean {
  return status === "TRIAL" || status === "ACTIVE";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/** Porcentaje de consumo, acotado a 100 para no romper las barras. */
export function usageRatio(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}
