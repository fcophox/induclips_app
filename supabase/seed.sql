-- =====================================================================
-- Seed de desarrollo.
-- Se aplica con `supabase db reset`. NUNCA se ejecuta en producción.
--
-- Crea DOS espacios a propósito: con uno solo, un fallo de aislamiento es
-- invisible durante el desarrollo. Con dos, salta a la vista en cuanto
-- aparezca en una lista algo que pertenece al otro.
--
-- Tres cuentas, una por rol que importa:
--   root@example.com   SuperAdmin — ve la plataforma entera, entra a /admin
--   alice@example.com  OWNER del espacio 'demo'
--   bob@example.com    OWNER del espacio 'otra', para contrastar aislamiento
-- =====================================================================

do $$
declare
  v_root  uuid := gen_random_uuid();
  v_alice uuid := gen_random_uuid();
  v_bob   uuid := gen_random_uuid();
  v_demo  uuid;
  v_otra  uuid;
begin
  -- ---------------- usuarios (contraseña: password123) ----------------
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at,
                          -- GoTrue lee estas columnas como `string`, no como
                          -- `*string`: dejarlas a NULL provoca un 500
                          -- ("converting NULL to string is unsupported") en
                          -- CADA intento de login. Deben ser cadena vacía.
                          confirmation_token, recovery_token,
                          email_change_token_new, email_change_token_current,
                          email_change, phone_change, phone_change_token,
                          reauthentication_token)
  values
    (v_root,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'root@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Root"}', now(), now(),
     '', '', '', '', '', '', '', ''),
    (v_alice, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'alice@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Alice"}', now(), now(),
     '', '', '', '', '', '', '', ''),
    (v_bob,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'bob@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Bob"}', now(), now(),
     '', '', '', '', '', '', '', '');

  -- El primer SuperAdmin se marca aquí porque no hay ninguno que pueda
  -- promoverlo: `tg_protect_superadmin_flag` sólo cede ante otro SuperAdmin o
  -- ante contexto de plataforma, y el seed corre por conexión SQL directa.
  update public.users_profiles set is_superadmin = true where id = v_root;

  -- ---------------- espacios ----------------
  insert into public.tenants (slug, name, status, plan, branding)
  values ('demo', 'Espacio Demo', 'ACTIVE', 'ENTERPRISE',
          '{"logoUrl":null,"faviconUrl":null,"primary":"#111827","secondary":"#6366f1","radius":"0.625rem"}')
  returning id into v_demo;

  -- Colores deliberadamente distintos: al cambiar de espacio, el theming
  -- dinámico debe notarse de inmediato. Si los dos se ven igual, la marca del
  -- cliente no se está aplicando.
  insert into public.tenants (slug, name, status, plan, branding)
  values ('otra', 'Otra Empresa', 'ACTIVE', 'PRO',
          '{"logoUrl":null,"faviconUrl":null,"primary":"#e11d48","secondary":"#f59e0b","radius":"1rem"}')
  returning id into v_otra;

  insert into public.tenant_users (tenant_id, user_id, role, accepted_at) values
    (v_demo, v_alice, 'OWNER', now()),
    (v_otra, v_bob,   'OWNER', now());

  -- ---------------- rastro de auditoría ----------------
  -- Da algo que mirar en /admin/audit desde el primer arranque.
  insert into public.audit_logs (tenant_id, actor_id, action, entity, entity_id) values
    (v_demo, v_root, 'tenant.create', 'tenants', v_demo),
    (v_otra, v_root, 'tenant.create', 'tenants', v_otra);

  raise notice 'Seed listo — root@example.com (superadmin) / alice@example.com / bob@example.com (password123)';
end $$;
