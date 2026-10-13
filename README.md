# Starter multi-tenant

Base para arrancar un proyecto con el acceso ya resuelto: login, roles,
invitaciones, panel de superadministración y marca por cliente. Todo lo que
sigue —contenidos, pedidos, reservas, lo que toque— se construye encima.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase
(Postgres, RLS, Auth, Storage).

## Qué trae resuelto

| Pieza | Dónde |
|---|---|
| Acceso, recuperación y cambio de contraseña | [`src/app/(auth)`](src/app/(auth)) |
| Sesión en SSR y refresco en el middleware | [`src/lib/supabase`](src/lib/supabase), [`src/middleware.ts`](src/middleware.ts) |
| Roles y permisos | [`src/lib/auth/roles.ts`](src/lib/auth/roles.ts), [`guards.ts`](src/lib/auth/guards.ts) |
| Panel de superadmin: espacios, miembros, auditoría | [`src/app/(platform)/admin`](src/app/(platform)/admin) |
| Equipo e invitaciones dentro de un espacio | [`src/app/(dashboard)/[tenantSlug]/team`](src/app/(dashboard)/[tenantSlug]/team) |
| Marca por cliente aplicada en servidor | [`src/lib/theme`](src/lib/theme), [`src/components/tenant-theme.tsx`](src/components/tenant-theme.tsx) |
| Subida de archivos con cuota, a Supabase / S3 / R2 | [`src/lib/storage`](src/lib/storage), [`src/app/api/media/upload`](src/app/api/media/upload) |
| Sistema de diseño | [`tokens.yml`](tokens.yml) → ver [DESIGN.md](DESIGN.md) |
| Aislamiento entre clientes | [`supabase/migrations`](supabase/migrations) + [`supabase/tests`](supabase/tests) |

Cuatro roles por espacio: `OWNER` › `ADMIN` › `EDITOR` › `CONTRIBUTOR`. Más el
SuperAdmin, que es de la plataforma y atraviesa el aislamiento para dar soporte.

## Puesta en marcha

```bash
npm install
```

```bash
supabase start && npm run env:local && supabase db reset && npm run db:types
```

```bash
npm run dev
```

Cuentas del seed, todas con contraseña `password123`:

| Cuenta | Qué es |
|---|---|
| `root@example.com` | SuperAdmin — aterriza en `/admin` |
| `alice@example.com` | OWNER del espacio `demo` |
| `bob@example.com` | OWNER del espacio `otra` |

Existen dos espacios a propósito. Con uno solo, un fallo de aislamiento es
invisible durante el desarrollo; con dos salta a la vista en cuanto aparece en
una lista algo que pertenece al otro.

## Prototipo InduLearn

En `/indulearn` vive un prototipo navegable de una plataforma de microlearning
multimarca. Está **aislado** del resto: no usa la sesión de Supabase ni la
base de datos. Todo son datos de ejemplo guardados en el navegador
(`localStorage`), y los permisos por marca se simulan en la interfaz — no es
apto para producción.

Se entra eligiendo un perfil demo (vendedor de una marca, vendedor multimarca
o administradora). Para volver al estado inicial: *Configuración → Restablecer
datos* dentro del panel administrativo.

| Pieza | Dónde |
|---|---|
| Datos de ejemplo, estado y persistencia local | [`src/lib/indulearn`](src/lib/indulearn) (`seed.ts`, `store.ts`) |
| Permisos por marca y cálculo de progreso | [`selectors.ts`](src/lib/indulearn/selectors.ts) |
| Indicadores (historial simulado) | [`analytics.ts`](src/lib/indulearn/analytics.ts) |
| Componentes: feed, reproductor, gráficos, layouts | [`src/components/indulearn`](src/components/indulearn) |
| Pantallas | [`src/app/indulearn`](src/app/indulearn) |

El reproductor es demostrativo: simula la reproducción con un reloj, sin
archivos de video. Para el MVP, `store.ts` es la costura que pasa a hablar con
el servidor y `analytics.ts` la que pasa a consultar eventos reales.

## Empezar un proyecto sobre esto

1. **Renombra.** `package.json`, `supabase/config.toml` (`project_id` y los
   puertos, si vas a tener varios proyectos levantados a la vez) y
   [`tokens.yml`](tokens.yml) para los colores.
2. **Crea tu esquema** en una migración nueva bajo `supabase/migrations/`.
3. **Dale políticas** en `0002_rls.sql`: añade la tabla al bloque
   `ENABLE + FORCE`, sus `GRANT` y sus `create policy`. El test 001 falla si
   una tabla con `tenant_id` se queda sin RLS, sin FORCE o sin políticas — es
   la red que atrapa el descuido más caro.
4. **Añade el permiso** en `PERMISSIONS` de
   [`roles.ts`](src/lib/auth/roles.ts) y la sección en `GROUP_GESTION` de
   [`dashboard-shell.tsx`](src/components/shared/dashboard-shell.tsx) y en
   `SEGMENTS` de [`breadcrumb-bar.tsx`](src/components/shared/breadcrumb-bar.tsx).
5. **Extiende la matriz** de `supabase/tests/002_rbac_matrix.test.sql` y la
   factory `tests.seed_content` de `helpers.psql`: los tests de aislamiento
   recorren lo que la factory siembra, así que una tabla que no pase por ahí
   no está cubierta.
6. **Regenera los tipos**: `npm run db:types`.

Si vas a limitar el uso de algo nuevo, la dimensión va en cuatro sitios o en
ninguno: `TenantLimits` ([limits.ts](src/lib/limits.ts)), los tres planes de
[plans.ts](src/lib/auth/plans.ts), el default de `tenants.limits` en la
migración y la vista `platform_tenant_overview`. Un límite que la vista no
cuenta no se aplica.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca en desarrollo (genera los tokens antes) |
| `npm run db:reset` | Reaplica migraciones y seed |
| `npm run db:types` | Regenera `src/lib/supabase/types.ts` desde la base local |
| `npm run env:local` | Escribe `.env.local` con las claves del Supabase local |
| `npm run test` | Unitarios + seguridad + integración |
| `npm run test:security` | pgTAP de RLS + guardia de la service role key |
| `npm run tokens:watch` | Regenera el CSS del design system al guardar |

## Seguridad

**La frontera real es RLS, no el código.** `PERMISSIONS` en `roles.ts` sólo
decide qué botones se pintan; si las dos discrepan, manda
[`0002_rls.sql`](supabase/migrations/20260101000200_rls.sql). Ocultar un botón
no protege nada — cualquiera puede hablar con PostgREST directamente.

La suite de `supabase/tests` es bloqueante en CI. Cubre aislamiento entre
espacios, matriz de roles, escalada de privilegios y suspensión de acceso. Los
de `tests/integration` repiten la comprobación a través de PostgREST y Storage
reales, que es donde se escapan los datos que las políticas sí protegían —
embeds de relaciones, signed URLs.

`SUPABASE_SERVICE_ROLE_KEY` bypassea RLS. Nunca en código de cliente:
`scripts/check-service-role-leak.sh` lo verifica en cada build.

## Despliegue

`railway.json` está listo para Railway. Las migraciones de producción las
aplica el workflow de CI, y sólo cuando el push trae migraciones nuevas y los
tests de aislamiento están en verde. Necesita tres secrets:
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` y `SUPABASE_DB_PASSWORD`.

Si configuras revisores en el Environment `production` de GitHub, cada
aplicación queda esperando una aprobación humana y queda registrado quién la
dio.

> **Un proyecto Supabase nuevo, en una organización nueva.** Las cuotas del
> plan Free son por organización, no por proyecto: meter varios clientes en la
> misma agota el egress y el cupo de proyectos entre todos.
