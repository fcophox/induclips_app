-- =====================================================================
-- Esquema base multi-tenant
--
-- Cinco tablas y nada más: espacios, personas, membresía, archivos y
-- auditoría. Es el mínimo sobre el que se sostienen el login, los roles, el
-- panel de plataforma y las invitaciones.
--
-- Lo que construyas encima —contenidos, pedidos, reservas, lo que sea— añade
-- sus tablas en una migración nueva. La regla no negociable: toda tabla que
-- lleve `tenant_id` necesita su política en `0002_rls.sql`, o queda visible
-- para todos los espacios.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type tenant_status  as enum ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED');
create type tenant_plan    as enum ('FREE', 'PRO', 'ENTERPRISE');
create type tenant_role    as enum ('OWNER', 'ADMIN', 'EDITOR', 'CONTRIBUTOR');
create type storage_provider as enum ('SUPABASE', 'S3', 'R2');

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- TENANTS — un espacio de trabajo por cliente
-- ---------------------------------------------------------------------
create table public.tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text   not null,
  status        tenant_status not null default 'TRIAL',
  plan          tenant_plan   not null default 'FREE',

  -- Branding aplicado en runtime al panel (ver src/lib/theme).
  branding      jsonb not null default jsonb_build_object(
                  'logoUrl', null,
                  'faviconUrl', null,
                  'primary', '#111827',
                  'secondary', '#6366f1',
                  'radius', '0.625rem'
                ),

  -- Límites por plan. Los valores REALES viven aquí, no en el código: así un
  -- cliente concreto puede tener su plan con el doble de cupo sin inventar un
  -- plan nuevo. El catálogo comercial está en src/lib/auth/plans.ts.
  limits        jsonb not null default jsonb_build_object(
                  'maxUsers', 3,
                  'maxStorageMb', 1024
                ),

  storage_provider     storage_provider not null default 'SUPABASE',
  storage_bucket       text not null default 'tenant-media',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists tenants_status_idx on public.tenants (status) where deleted_at is null;

drop trigger if exists tenants_updated_at on public.tenants;
create trigger tenants_updated_at before update on public.tenants
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- USERS PROFILES  (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.users_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         citext not null,
  full_name     text,
  avatar_url    text,
  -- SuperAdmin = tu equipo. Atraviesa el aislamiento por tenant para dar
  -- soporte; es el único rol que no cuelga de una membresía.
  is_superadmin boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists users_profiles_updated_at on public.users_profiles;
create trigger users_profiles_updated_at before update on public.users_profiles
  for each row execute function public.tg_set_updated_at();

/**
 * El perfil nace con el usuario de Auth.
 *
 * Sin esto, un alta por invitación deja una fila en `auth.users` sin perfil, y
 * `getCurrentUser()` devuelve null: la persona entra con credenciales válidas
 * a una sesión que el resto de la app no reconoce.
 */
create or replace function public.tg_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users_profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- ---------------------------------------------------------------------
-- TENANT_USERS  (membresía + rol)
-- ---------------------------------------------------------------------
create table public.tenant_users (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references public.users_profiles(id) on delete cascade,
  role        tenant_role not null default 'EDITOR',
  invited_by  uuid references public.users_profiles(id) on delete set null,
  accepted_at timestamptz,
  -- Pausar el acceso sin borrar la membresía: alguien de vacaciones, un
  -- freelance entre proyectos, una cuenta bajo sospecha. Borrar y reinvitar
  -- perdía el rastro de quién invitó a quién y con qué rol.
  suspended_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id)
);
create index if not exists tenant_users_tenant_idx on public.tenant_users (tenant_id);

-- `user_tenant_ids()` corre en cada petición y filtra por `suspended_at`.
-- Sin este índice parcial tendría que leer también las filas pausadas.
create index if not exists tenant_users_active_idx
  on public.tenant_users (user_id)
  where suspended_at is null;

comment on column public.tenant_users.suspended_at is
  'Acceso pausado por un gestor del espacio o por el superadmin. Null = activo.';

-- ---------------------------------------------------------------------
-- MEDIA — logos, avatares y lo que subas encima
-- ---------------------------------------------------------------------
create table public.media (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  provider     storage_provider not null default 'SUPABASE',
  bucket       text not null,
  path         text not null,          -- siempre "<tenant_id>/<yyyy>/<mm>/<uuid>.<ext>"
  mime_type    text not null,
  size_bytes   bigint not null,
  width        integer,
  height       integer,
  alt_text     text,
  checksum     text,
  uploaded_by  uuid references public.users_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (bucket, path)
);
create index if not exists media_tenant_idx on public.media (tenant_id, created_at desc);

-- Blindaje: la ruta física SIEMPRE empieza por el tenant_id. Las políticas de
-- storage.objects aíslan por ese prefijo, así que una ruta que no lo respete
-- sería un archivo fuera de toda política.
alter table public.media
  add constraint media_path_tenant_prefix
  check (path like tenant_id::text || '/%');

-- ---------------------------------------------------------------------
-- AUDIT LOG
--
-- Append-only desde el servidor: no hay política de INSERT para
-- `authenticated`, sólo service_role escribe aquí. Un registro que el propio
-- actor pudiera editar no serviría de nada el día que importa.
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references public.tenants(id) on delete cascade,
  actor_id    uuid references public.users_profiles(id) on delete set null,
  action      text not null,        -- 'member.invite', 'tenant.suspend', ...
  entity      text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_tenant_idx on public.audit_logs (tenant_id, created_at desc);
