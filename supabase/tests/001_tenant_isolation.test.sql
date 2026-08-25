-- =====================================================================
-- TEST BLOQUEANTE: aislamiento entre tenants
--
-- Si este archivo falla, el despliegue se detiene. En un multi-tenant
-- sobre base de datos compartida, una fuga aquí es una fuga de datos de
-- un cliente a otro.
--
--   ejecutar: supabase test db
-- =====================================================================
\ir helpers.psql

begin;
select no_plan();

-- =====================================================================
-- 0. GUARDIA ESTRUCTURAL
--
-- Los tests de abajo comprueban tablas nombradas a mano. Este comprueba
-- las que nadie se acordó de nombrar: una tabla nueva con `tenant_id` y
-- sin RLS no rompe nada visible — la app funciona, la suite pasa, y el
-- aislamiento simplemente no existe. Es el fallo más probable de todos.
-- =====================================================================
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attname = 'tenant_id'
      and a.attnum > 0
      and not a.attisdropped
      and not c.relrowsecurity
  $$,
  'TODA tabla de public con columna tenant_id tiene RLS habilitada'
);

-- `ENABLE` no basta: sin `FORCE`, el propietario de la tabla se salta sus
-- propias políticas — y las migraciones crean las tablas como propietario.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attname = 'tenant_id'
      and a.attnum > 0
      and not a.attisdropped
      and not c.relforcerowsecurity
  $$,
  'TODA tabla con tenant_id tiene además FORCE ROW LEVEL SECURITY'
);

-- Una tabla con RLS y sin políticas queda inaccesible: falla en runtime,
-- no en el test. Mejor detectarlo aquí.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attname = 'tenant_id'
      and a.attnum > 0
      and not a.attisdropped
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  $$,
  'ninguna tabla con tenant_id se queda sin políticas'
);

-- ---------------------------------------------------------------------
-- ESCENARIO
--   Espacio A — alice es OWNER
--   Espacio B — bob   es OWNER
--   mallory   — usuario sin ninguna membresía
--   root      — SuperAdmin de la plataforma
-- ---------------------------------------------------------------------
create temporary table fx (k text primary key, v uuid);
-- Legible tras login_as(): las temp tables no heredan permisos.
grant select on fx to public;

insert into fx (k, v) values
  ('alice',   tests.create_user('alice@example.com')),
  ('bob',     tests.create_user('bob@example.com')),
  ('mallory', tests.create_user('mallory@example.com')),
  ('root',    tests.create_user('root@example.com', true)),
  ('tenantA', tests.create_tenant('demo')),
  ('tenantB', tests.create_tenant('otra'));

select tests.add_member(
  (select v from fx where k = 'tenantA'),
  (select v from fx where k = 'alice'), 'OWNER');
select tests.add_member(
  (select v from fx where k = 'tenantB'),
  (select v from fx where k = 'bob'), 'OWNER');

create temporary table seeded (tenant text primary key, ids jsonb);
grant select on seeded to public;
insert into seeded values
  ('A', tests.seed_content((select v from fx where k = 'tenantA'), (select v from fx where k = 'alice'))),
  ('B', tests.seed_content((select v from fx where k = 'tenantB'), (select v from fx where k = 'bob')));

-- =====================================================================
-- 1. LECTURA — alice NO ve una sola fila del tenant B
-- =====================================================================
select tests.login_as((select v from fx where k = 'alice'));

select is(
  tests.rows_visible(tbl, (select v from fx where k = 'tenantB')),
  0::bigint,
  format('alice no ve filas de otro tenant en public.%s', tbl)
)
from unnest(array[
  'tenants', 'tenant_users', 'media', 'audit_logs'
]) as tbl;

-- ...y sí ve las suyas (un test que sólo comprueba ceros pasaría con RLS
-- mal configurada que bloquee absolutamente todo).
select is(
  tests.rows_visible(tbl, (select v from fx where k = 'tenantA')),
  1::bigint,
  format('alice sí ve sus propias filas en public.%s', tbl)
)
from unnest(array['media', 'audit_logs']) as tbl;

-- =====================================================================
-- 2. ESCRITURA — alice no puede tocar datos del tenant B
-- =====================================================================

-- 2.1 UPDATE cruzado: RLS lo convierte en un no-op (0 filas), no en error.
--     Por eso se afirma sobre el conteo, no con throws_ok.
with attempt as (
  update public.media set alt_text = 'HACKED'
  where tenant_id = (select v from fx where k = 'tenantB')
  returning 1
)
select is((select count(*) from attempt), 0::bigint,
  'UPDATE sobre media de otro espacio no afecta a ninguna fila');

-- 2.2 DELETE cruzado
with attempt as (
  delete from public.media
  where tenant_id = (select v from fx where k = 'tenantB')
  returning 1
)
select is((select count(*) from attempt), 0::bigint,
  'DELETE sobre media de otro espacio no afecta a ninguna fila');

-- 2.3 INSERT en el tenant ajeno: la política WITH CHECK sí lanza error.
select throws_ok(
  format(
    'insert into public.media (tenant_id, bucket, path, mime_type, size_bytes)
     values (%L, ''tenant-media'', %L, ''image/webp'', 1)',
    (select v from fx where k = 'tenantB'),
    (select v::text from fx where k = 'tenantB') || '/2026/01/intruso.webp'
  ),
  '42501',
  null,
  'INSERT de un archivo en otro espacio es rechazado por RLS'
);

-- 2.4 Auto-invitarse al tenant ajeno — el vector de escalada más obvio
select throws_ok(
  format(
    'insert into public.tenant_users (tenant_id, user_id, role)
     values (%L, %L, ''OWNER'')',
    (select v from fx where k = 'tenantB'),
    (select v from fx where k = 'alice')
  ),
  '42501',
  null,
  'no se puede auto-añadir como miembro de otro tenant'
);

-- 2.5 La ruta física de un archivo debe empezar por SU tenant_id.
--     RLS no lo cubre: la fila declara un tenant_id válido. Lo bloquea el
--     CHECK. Sin él, un miembro podría escribir en la carpeta de otro
--     espacio, que es donde las políticas de storage.objects aíslan.
select throws_ok(
  format(
    'insert into public.media (tenant_id, bucket, path, mime_type, size_bytes)
     values (%L, ''tenant-media'', %L, ''image/webp'', 1)',
    (select v from fx where k = 'tenantA'),
    (select v::text from fx where k = 'tenantB') || '/2026/01/cruzado.webp'
  ),
  '23514',
  null,
  'un archivo no puede escribirse bajo la carpeta de otro espacio'
);

-- =====================================================================
-- 3. USUARIO SIN MEMBRESÍA — no ve absolutamente nada
-- =====================================================================
select tests.logout();
select tests.login_as((select v from fx where k = 'mallory'));

select is(
  tests.rows_visible(tbl, (select v from fx where k = 'tenantA')) +
  tests.rows_visible(tbl, (select v from fx where k = 'tenantB')),
  0::bigint,
  format('un usuario sin membresía no ve nada en public.%s', tbl)
)
from unnest(array[
  'tenants', 'tenant_users', 'media', 'audit_logs'
]) as tbl;

-- Tampoco puede crearse un tenant y colarse: eso es exclusivo del SuperAdmin.
select throws_ok(
  'insert into public.tenants (slug, name) values (''pirata'', ''Pirata'')',
  '42501',
  null,
  'un usuario normal no puede crear espacios'
);

-- =====================================================================
-- 4. ANÓNIMO — la API pública no pasa por `anon`
-- =====================================================================
select tests.logout();
select tests.login_as_anon();

select throws_ok(
  'select count(*) from public.media',
  '42501',
  null,
  'el rol anon no alcanza siquiera la tabla media'
);

-- =====================================================================
-- 5. SUPERADMIN — sí ve todo (soporte y operación)
-- =====================================================================
select tests.logout();
select tests.login_as((select v from fx where k = 'root'));

-- Se cuentan SÓLO las filas de este escenario, no todas las de la base: el
-- seed de desarrollo también inserta espacios, y un conteo absoluto haría que
-- el test fallara según cuándo se ejecute.
select is(
  (select count(*) from public.tenants
   where id in ((select v from fx where k = 'tenantA'), (select v from fx where k = 'tenantB'))),
  2::bigint,
  'el SuperAdmin ve los espacios de ambos clientes'
);
select is(
  (select count(*) from public.media
   where tenant_id in ((select v from fx where k = 'tenantA'), (select v from fx where k = 'tenantB'))),
  2::bigint,
  'el SuperAdmin ve los archivos de ambos clientes'
);
select lives_ok(
  'insert into public.tenants (slug, name) values (''nuevo-cliente'', ''Nuevo Cliente'')',
  'el SuperAdmin puede dar de alta espacios'
);

select tests.logout();
select * from finish();
rollback;
