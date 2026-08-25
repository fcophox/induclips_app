/**
 * Frontera JSONB ↔ TypeScript para límites y consumo del espacio.
 *
 * Postgres devuelve `jsonb` como `Json`, una unión que incluye `string`,
 * `number` y `null`. El código de la app espera objetos. Estos helpers hacen
 * la conversión en un solo sitio, con un valor por defecto sensato, en lugar
 * de repartir `as any` por las páginas.
 *
 * No son validación: un JSONB corrupto pasaría igual. Son la garantía mínima
 * de que un `null` en la base no revienta el render.
 */

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Lo que un espacio puede consumir.
 *
 * Al añadir una tabla que quieras limitar —contenidos, pedidos, lo que sea—
 * añade su campo aquí, en `TenantUsage`, en el default de `tenants.limits`
 * (migración `0001_core.sql`) y en la vista `platform_tenant_overview`. Los
 * cuatro sitios o ninguno: un límite que la vista no cuenta no se aplica.
 */
export type TenantLimits = {
  maxUsers: number;
  maxStorageMb: number;
};

const DEFAULT_LIMITS: TenantLimits = {
  maxUsers: 3,
  maxStorageMb: 1024,
};

export function asLimits(value: unknown): TenantLimits {
  const record = asRecord(value);
  const num = (key: keyof TenantLimits) =>
    typeof record[key] === "number" ? (record[key] as number) : DEFAULT_LIMITS[key];
  return {
    maxUsers: num("maxUsers"),
    maxStorageMb: num("maxStorageMb"),
  };
}

/** Lo que un espacio consume de verdad, según `platform_tenant_overview`. */
export type TenantUsage = {
  users: number;
  storageMb: number;
};

export function asUsage(value: unknown): TenantUsage {
  const record = asRecord(value);
  const num = (key: string) => (typeof record[key] === "number" ? (record[key] as number) : 0);
  return {
    users: num("users"),
    storageMb: num("storageMb"),
  };
}
