import Link from "next/link";
import { HardDrive, Users, Package, Shield } from "lucide-react";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { createServerClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { formatBytes } from "@/lib/auth/plans";

export const metadata = { title: "Resumen" };

/**
 * Pantalla de entrada del espacio.
 *
 * El consumo sale de `platform_tenant_overview` y no de una consulta propia:
 * la vista ya agrega los contadores con `security_invoker`, así que quien la
 * lee ve exactamente su espacio y ni una fila más. Calcularlo aparte aquí
 * significaría mantener dos definiciones de "cuánto consume un cliente", y
 * son justo las que se separan sin que nadie lo note.
 *
 * Al añadir tus tablas, este es el sitio natural para su actividad reciente.
 */
export default async function OverviewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  // Memoizado con cache(): esta llamada no repite la consulta del layout.
  const { tenant, role, user } = await getTenantContext(tenantSlug);

  const supabase = await createServerClient();

  const { data: overview } = await supabase
    .from("platform_tenant_overview")
    .select("users_count, storage_bytes")
    .eq("id", tenant.id)
    .maybeSingle();

  const usersCount = overview?.users_count ?? 0;
  const storageBytes = overview?.storage_bytes ?? 0;

  const firstName = user.fullName?.split(" ")[0] ?? user.email.split("@")[0];

  const stats = [
    {
      label: "Colaboradores",
      value: String(usersCount),
      max: String(tenant.limits.maxUsers),
      icon: Users,
    },
    {
      label: "Almacenamiento",
      value: formatBytes(storageBytes),
      max: `${tenant.limits.maxStorageMb} MB`,
      icon: HardDrive,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">
          Hola, <span className="font-medium text-foreground">{firstName}</span>, te damos la bienvenida
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{tenant.name}</h1>
        <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Package className="size-4" />
            Plan {tenant.plan.toLowerCase()}
          </span>
          <span className="opacity-50">·</span>
          <span className="flex items-center gap-1.5">
            <Shield className="size-4" />
            Rol: {role.toLowerCase()}
          </span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {stats.map(({ label, value, max, icon: Icon }) => (
          <div key={label} className="rounded-[var(--radius)] border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="size-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">de {max}</div>
          </div>
        ))}
      </section>

      {/*
        Punto de partida: aquí es donde el proyecto empieza a diferenciarse.
        El enlace se muestra sólo a quien administra, porque la primera acción
        real de un espacio recién creado es invitar a alguien.
      */}
      <section className="mt-8 rounded-[var(--radius)] border border-dashed bg-card p-6">
        <h2 className="text-sm font-medium">Este espacio está listo</h2>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          El acceso, los roles y la marca ya funcionan. Lo siguiente es añadir
          las secciones propias de tu proyecto: crea sus tablas en una
          migración, dales su política en <code>0002_rls.sql</code> y añádelas
          al menú lateral.
        </p>
        {can(role, "team.manage") && (
          <Link
            href={`/${tenantSlug}/team`}
            className="mt-4 inline-flex items-center rounded-[var(--radius)] border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Invitar a alguien
          </Link>
        )}
      </section>
    </div>
  );
}
