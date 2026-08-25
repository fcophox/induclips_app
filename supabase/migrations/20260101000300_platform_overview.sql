-- =====================================================================
-- Vista de plataforma: todos los espacios con su uso, en una sola consulta.
--
-- El panel de superadmin lista N clientes con sus contadores. Calcularlos por
-- cliente son N+1 consultas; con 200 clientes la pantalla tarda segundos.
--
-- `security_invoker = true` es lo que hace que esto sea seguro: la vista NO
-- tiene privilegios propios, aplica las políticas de quien la consulta. Un
-- SuperAdmin ve todas las filas porque `tenants_select` se lo permite; quien
-- administra un espacio vería sólo el suyo. Con `security_definer` (el defecto
-- en Postgres < 15) esta vista sería una fuga de datos entre clientes.
--
-- Al añadir una tabla cuyo uso quieras mostrar, añade aquí su subconsulta y
-- amplía `TenantUsage` en src/lib/limits.ts.
-- =====================================================================

create view public.platform_tenant_overview
with (security_invoker = true) as
select
  t.id,
  t.slug,
  t.name,
  t.status,
  t.plan,
  t.limits,
  t.branding,
  t.created_at,
  (select count(*) from public.tenant_users tu where tu.tenant_id = t.id) as users_count,
  (select coalesce(sum(m.size_bytes), 0) from public.media m where m.tenant_id = t.id) as storage_bytes,
  (select max(tu.created_at) from public.tenant_users tu where tu.tenant_id = t.id) as last_activity_at
from public.tenants t
where t.deleted_at is null;

grant select on public.platform_tenant_overview to authenticated;
revoke all on public.platform_tenant_overview from anon;

comment on view public.platform_tenant_overview is
  'Espacios con contadores de uso. security_invoker: cada quien ve lo que sus políticas permiten.';
