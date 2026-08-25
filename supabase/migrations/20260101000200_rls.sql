-- =====================================================================
-- Row Level Security
-- Modelo: una base de datos, aislamiento lógico estricto por tenant_id.
--
-- Reglas de oro:
--   1. TODA tabla con tenant_id lleva RLS habilitada + FORCE.
--   2. Los helpers son SECURITY DEFINER + STABLE → no recursan contra las
--      políticas y el planner los cachea como InitPlan.
--   3. Se envuelven en (select fn()) para que Postgres los evalúe UNA vez por
--      consulta en lugar de una vez por fila.
--
-- Esta es la frontera de seguridad real. `src/lib/auth/roles.ts` sólo decide
-- qué botones se pintan; si las dos discrepan, manda este archivo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_superadmin from public.users_profiles p where p.id = auth.uid()), false);
$$;

/**
 * Los espacios del usuario — la base de casi toda política del sistema.
 *
 * Filtra las membresías pausadas: al vaciarse para quien está suspendido,
 * pierde de golpe archivos, compañeros y su propia fila de `tenant_users`. Si
 * la pausa viviera sólo en la interfaz, sus llamadas directas a PostgREST
 * seguirían funcionando.
 */
create or replace function public.user_tenant_ids()
returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(tu.tenant_id), '{}')
  from public.tenant_users tu
  where tu.user_id = auth.uid()
    and tu.suspended_at is null;
$$;

create or replace function public.has_tenant_role(p_tenant uuid, p_roles tenant_role[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_users tu
    where tu.user_id = auth.uid()
      and tu.tenant_id = p_tenant
      and tu.suspended_at is null
      and tu.role = any (p_roles)
  );
$$;

/**
 * ¿Contexto de plataforma en lugar de petición de usuario?
 *
 * Dos casos: conexión SQL directa (migraciones, seed, psql) donde no hay JWT,
 * o una petición con service_role. Ambos ya son privilegiados: el primero es
 * acceso directo a la base, el segundo bypassea RLS por definición.
 *
 * Existe porque los triggers de blindaje de columnas, aplicados sin excepción,
 * hacen imposible arrancar el sistema: revierten en silencio el UPDATE que
 * marca al primer SuperAdmin, dejando el proyecto sin nadie que pueda crear
 * equipo. Un `if not is_superadmin()` sólo funciona si YA existe uno.
 */
create or replace function public.is_platform_context()
returns boolean
language plpgsql stable as $$
declare
  v_claims text := current_setting('request.jwt.claims', true);
begin
  -- Sin JWT: conexión SQL directa, no una petición de la API.
  if v_claims is null or v_claims = '' then
    return true;
  end if;
  return coalesce((v_claims::jsonb) ->> 'role', '') = 'service_role';
exception
  when others then
    -- Claims presentes pero ilegibles: tratar como petición de usuario.
    return false;
end;
$$;

-- Azúcar sintáctico legible en las políticas
create or replace function public.is_tenant_member(p_tenant uuid)
returns boolean language sql stable as $$
  select p_tenant = any (public.user_tenant_ids());
$$;

create or replace function public.is_tenant_manager(p_tenant uuid)
returns boolean language sql stable as $$
  select public.has_tenant_role(p_tenant, array['OWNER','ADMIN']::tenant_role[]);
$$;

revoke execute on function public.is_superadmin()       from public;
revoke execute on function public.user_tenant_ids()     from public;
revoke execute on function public.has_tenant_role(uuid, tenant_role[]) from public;
grant  execute on function public.is_superadmin()       to authenticated;
grant  execute on function public.user_tenant_ids()     to authenticated;
grant  execute on function public.has_tenant_role(uuid, tenant_role[]) to authenticated;
grant  execute on function public.is_tenant_member(uuid)   to authenticated;
grant  execute on function public.is_platform_context()    to authenticated;
grant  execute on function public.is_tenant_manager(uuid)  to authenticated;

-- ---------------------------------------------------------------------
-- ENABLE + FORCE
--
-- Al añadir una tabla con tenant_id, añádela aquí. FORCE importa: sin él, el
-- dueño de la tabla se salta sus propias políticas.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'tenants','users_profiles','tenant_users','media','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- GRANTS
-- RLS filtra filas, pero GRANT decide si la tabla es alcanzable siquiera.
-- Se declaran explícitamente en lugar de confiar en los default privileges
-- del proyecto: si alguien los altera, las políticas seguirían siendo
-- correctas y la app dejaría de funcionar por una razón no obvia.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.tenants, public.users_profiles, public.tenant_users, public.media
  to authenticated;

grant select on public.audit_logs to authenticated;

-- `anon` no toca datos de negocio. Si algún día expones una API pública,
-- hazlo por route handlers con service_role tras validar la credencial, no
-- abriendo RLS a anónimos.
revoke all on all tables in schema public from anon;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------
-- TENANTS
-- ---------------------------------------------------------------------
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants for select to authenticated
  using ( (select public.is_superadmin()) or id in (select unnest(public.user_tenant_ids())) );

-- Alta y baja de espacios: exclusivo del superadmin.
drop policy if exists tenants_insert on public.tenants;
create policy tenants_insert on public.tenants for insert to authenticated
  with check ( (select public.is_superadmin()) );

drop policy if exists tenants_delete on public.tenants;
create policy tenants_delete on public.tenants for delete to authenticated
  using ( (select public.is_superadmin()) );

-- Quien administra un espacio puede cambiar SU marca, no su plan ni su estado.
-- El bloqueo de columnas sensibles se hace con un trigger, no con RLS: RLS
-- decide qué filas, no qué columnas.
drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants for update to authenticated
  using ( (select public.is_superadmin()) or public.is_tenant_manager(id) )
  with check ( (select public.is_superadmin()) or public.is_tenant_manager(id) );

create or replace function public.tg_protect_tenant_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_superadmin() or public.is_platform_context() then
    return new;
  end if;
  -- Campos reservados a quien lleva la plataforma.
  new.plan             := old.plan;
  new.status           := old.status;
  new.limits           := old.limits;
  new.slug             := old.slug;
  new.storage_provider := old.storage_provider;
  new.storage_bucket   := old.storage_bucket;
  new.deleted_at       := old.deleted_at;
  return new;
end;
$$;
drop trigger if exists tenants_protect_columns on public.tenants;
create trigger tenants_protect_columns before update on public.tenants
  for each row execute function public.tg_protect_tenant_columns();

-- ---------------------------------------------------------------------
-- USERS_PROFILES
-- ---------------------------------------------------------------------
drop policy if exists profiles_select_self on public.users_profiles;
create policy profiles_select_self on public.users_profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_superadmin())
    -- visible para compañeros del mismo espacio
    or exists (
      select 1 from public.tenant_users tu
      where tu.user_id = users_profiles.id
        and tu.tenant_id in (select unnest(public.user_tenant_ids()))
    )
  );

drop policy if exists profiles_update_self on public.users_profiles;
create policy profiles_update_self on public.users_profiles for update to authenticated
  using ( id = (select auth.uid()) or (select public.is_superadmin()) )
  with check ( id = (select auth.uid()) or (select public.is_superadmin()) );

-- Nadie se auto-promueve a SuperAdmin desde el cliente.
create or replace function public.tg_protect_superadmin_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_superadmin() or public.is_platform_context()) then
    new.is_superadmin := old.is_superadmin;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_superadmin on public.users_profiles;
create trigger profiles_protect_superadmin before update on public.users_profiles
  for each row execute function public.tg_protect_superadmin_flag();

-- ---------------------------------------------------------------------
-- TENANT_USERS  (gestión de colaboradores → OWNER/ADMIN)
-- ---------------------------------------------------------------------
drop policy if exists tenant_users_select on public.tenant_users;
create policy tenant_users_select on public.tenant_users for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id in (select unnest(public.user_tenant_ids())) );

drop policy if exists tenant_users_write on public.tenant_users;
create policy tenant_users_write on public.tenant_users for insert to authenticated
  with check ( (select public.is_superadmin()) or public.is_tenant_manager(tenant_id) );

drop policy if exists tenant_users_update on public.tenant_users;
create policy tenant_users_update on public.tenant_users for update to authenticated
  using ( (select public.is_superadmin()) or public.is_tenant_manager(tenant_id) )
  with check ( (select public.is_superadmin()) or public.is_tenant_manager(tenant_id) );

drop policy if exists tenant_users_delete on public.tenant_users;
create policy tenant_users_delete on public.tenant_users for delete to authenticated
  using ( (select public.is_superadmin()) or public.is_tenant_manager(tenant_id) );

-- ---------------------------------------------------------------------
-- MEDIA
-- ---------------------------------------------------------------------
drop policy if exists media_select on public.media;
create policy media_select on public.media for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id in (select unnest(public.user_tenant_ids())) );

drop policy if exists media_insert on public.media;
create policy media_insert on public.media for insert to authenticated
  with check ( (select public.is_superadmin()) or public.is_tenant_member(tenant_id) );

drop policy if exists media_update on public.media;
create policy media_update on public.media for update to authenticated
  using ( (select public.is_superadmin()) or public.is_tenant_member(tenant_id) )
  with check ( (select public.is_superadmin()) or public.is_tenant_member(tenant_id) );

-- Borrar lo ajeno pide rango; lo tuyo lo borras siempre.
drop policy if exists media_delete on public.media;
create policy media_delete on public.media for delete to authenticated
  using (
    (select public.is_superadmin())
    or public.has_tenant_role(tenant_id, array['OWNER','ADMIN','EDITOR']::tenant_role[])
    or uploaded_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------
-- AUDIT LOGS  (append-only desde el servidor; lectura para managers)
-- ---------------------------------------------------------------------
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using ( (select public.is_superadmin()) or public.is_tenant_manager(tenant_id) );

-- ---------------------------------------------------------------------
-- STORAGE — bucket único, aislamiento por prefijo <tenant_id>/
-- (Supabase limita el nº de buckets; el prefijo escala a miles de espacios
--  y permite mover el bucket a S3/R2 sin migrar rutas.)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tenant-media', 'tenant-media', false)
on conflict (id) do nothing;

drop policy if exists "tenant media read" on storage.objects;
create policy "tenant media read" on storage.objects for select to authenticated
  using (
    bucket_id = 'tenant-media'
    and (storage.foldername(name))[1]::uuid in (select unnest(public.user_tenant_ids()))
  );

drop policy if exists "tenant media insert" on storage.objects;
create policy "tenant media insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tenant-media'
    and (storage.foldername(name))[1]::uuid in (select unnest(public.user_tenant_ids()))
  );

drop policy if exists "tenant media update" on storage.objects;
create policy "tenant media update" on storage.objects for update to authenticated
  using (
    bucket_id = 'tenant-media'
    and (storage.foldername(name))[1]::uuid in (select unnest(public.user_tenant_ids()))
  );

drop policy if exists "tenant media delete" on storage.objects;
create policy "tenant media delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'tenant-media'
    and (storage.foldername(name))[1]::uuid in (select unnest(public.user_tenant_ids()))
  );
