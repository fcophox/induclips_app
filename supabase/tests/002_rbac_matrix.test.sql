-- =====================================================================
-- TEST: matriz de roles dentro de un mismo espacio
--
-- El test 001 cubre "un cliente no ve a otro". Este cubre lo que ocurre
-- puertas adentro: quién gestiona el equipo, quién cambia la marca, quién
-- borra archivos ajenos y quién no puede auto-promoverse.
--
-- Al añadir tablas propias, extiende esta matriz. `PERMISSIONS` en
-- src/lib/auth/roles.ts sólo decide qué botones se pintan; lo que de verdad
-- corta es lo que aquí se comprueba.
-- =====================================================================
\ir helpers.psql

begin;
select no_plan();

create temporary table fx (k text primary key, v uuid);
-- Legible tras login_as(): las temp tables no heredan permisos.
grant select on fx to public;

insert into fx (k, v) values
  ('owner',       tests.create_user('owner@example.com')),
  ('admin',       tests.create_user('admin@example.com')),
  ('editor',      tests.create_user('editor@example.com')),
  ('contributor', tests.create_user('contrib@example.com')),
  ('nuevo',       tests.create_user('nuevo@example.com')),
  ('tenant',      tests.create_tenant('demo'));

select tests.add_member((select v from fx where k='tenant'), (select v from fx where k='owner'),       'OWNER');
select tests.add_member((select v from fx where k='tenant'), (select v from fx where k='admin'),       'ADMIN');
select tests.add_member((select v from fx where k='tenant'), (select v from fx where k='editor'),      'EDITOR');
select tests.add_member((select v from fx where k='tenant'), (select v from fx where k='contributor'), 'CONTRIBUTOR');

-- Un archivo subido por el OWNER: sirve para separar "lo mío" de "lo ajeno".
create temporary table ids as
  select tests.seed_content((select v from fx where k='tenant'), (select v from fx where k='owner')) as v;
grant select on ids to public;

-- =====================================================================
-- CONTRIBUTOR — participa, pero no gestiona
-- =====================================================================
select tests.login_as((select v from fx where k='contributor'));

-- Subir sí: cualquier miembro del espacio puede aportar archivos.
select lives_ok(
  format(
    'insert into public.media (tenant_id, bucket, path, mime_type, size_bytes, uploaded_by)
     values (%L, ''tenant-media'', %L, ''image/webp'', 100, %L)',
    (select v from fx where k='tenant'),
    (select v::text from fx where k='tenant') || '/2026/01/contrib.webp',
    (select v from fx where k='contributor')
  ),
  'CONTRIBUTOR puede subir archivos a su espacio'
);

-- Borrar lo ajeno no: `media_delete` pide EDITOR o ser quien lo subió.
with attempt as (
  delete from public.media
  where id = (select (v ->> 'media')::uuid from ids)
  returning 1
)
select is((select count(*) from attempt), 0::bigint,
  'CONTRIBUTOR no puede borrar un archivo que subió otra persona');

-- Gestionar el equipo tampoco.
select throws_ok(
  format(
    'insert into public.tenant_users (tenant_id, user_id, role)
     values (%L, %L, ''EDITOR'')',
    (select v from fx where k='tenant'),
    (select v from fx where k='nuevo')
  ),
  '42501',
  null,
  'CONTRIBUTOR no puede añadir miembros'
);

-- Y no puede ascenderse a sí mismo — el vector de escalada más directo.
with attempt as (
  update public.tenant_users set role = 'OWNER'
  where tenant_id = (select v from fx where k='tenant')
    and user_id = (select v from fx where k='contributor')
  returning 1
)
select is((select count(*) from attempt), 0::bigint,
  'CONTRIBUTOR no puede cambiarse el rol a sí mismo');

-- =====================================================================
-- EDITOR — manda sobre los archivos, no sobre las personas
-- =====================================================================
select tests.logout();
select tests.login_as((select v from fx where k='editor'));

with attempt as (
  update public.media set alt_text = 'revisado'
  where id = (select (v ->> 'media')::uuid from ids)
  returning 1
)
select is((select count(*) from attempt), 1::bigint,
  'EDITOR puede editar archivos ajenos de su espacio');

select throws_ok(
  format(
    'insert into public.tenant_users (tenant_id, user_id, role)
     values (%L, %L, ''EDITOR'')',
    (select v from fx where k='tenant'),
    (select v from fx where k='nuevo')
  ),
  '42501',
  null,
  'EDITOR no puede gestionar el equipo'
);

-- La marca es de quien administra: un EDITOR no la toca. Aquí RLS no lanza
-- error, simplemente no encuentra fila que actualizar.
with attempt as (
  update public.tenants set name = 'Renombrado por el editor'
  where id = (select v from fx where k='tenant')
  returning 1
)
select is((select count(*) from attempt), 0::bigint,
  'EDITOR no puede renombrar el espacio');

-- =====================================================================
-- ADMIN — gestiona equipo y marca, pero no su propio plan
-- =====================================================================
select tests.logout();
select tests.login_as((select v from fx where k='admin'));

update public.tenants set name = 'Renombrado por el admin'
where id = (select v from fx where k='tenant');

select is(
  (select name from public.tenants where id = (select v from fx where k='tenant')),
  'Renombrado por el admin',
  'ADMIN puede renombrar su espacio'
);

/*
 * El plan y los límites son de la plataforma.
 *
 * `tg_protect_tenant_columns` deja pasar el UPDATE y revierte la columna en
 * silencio, así que aquí se comprueba el VALOR y no el número de filas
 * afectadas: contar filas daría 1 y el test pasaría con la protección rota.
 */
update public.tenants set plan = 'ENTERPRISE', limits = '{"maxUsers":9999}'::jsonb
where id = (select v from fx where k='tenant');

select isnt(
  (select plan::text from public.tenants where id = (select v from fx where k='tenant')),
  'ENTERPRISE',
  'ADMIN no puede subirse el plan'
);

select isnt(
  (select limits ->> 'maxUsers' from public.tenants where id = (select v from fx where k='tenant')),
  '9999',
  'ADMIN no puede ampliarse los límites'
);

select lives_ok(
  format(
    'insert into public.tenant_users (tenant_id, user_id, role)
     values (%L, %L, ''EDITOR'')',
    (select v from fx where k='tenant'),
    (select v from fx where k='nuevo')
  ),
  'ADMIN sí puede dar de alta a un colaborador'
);

select tests.logout();
select * from finish();
rollback;
