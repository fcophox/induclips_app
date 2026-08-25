import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Aislamiento a través de la pila real: PostgREST y Storage.
 *
 * Los tests pgTAP validan las políticas dentro de Postgres. Estos validan lo
 * que un atacante alcanza de verdad — un `curl` contra PostgREST, una signed
 * URL — donde además intervienen la serialización y los embeds de relaciones,
 * que son por donde se escapan los datos que las políticas sí protegían.
 *
 *   supabase start && npx vitest run tests/integration
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

type Fixture = {
  tenantId: string;
  userId: string;
  client: SupabaseClient;
  mediaId: string;
  mediaPath: string;
};

const created: { users: string[]; tenants: string[] } = { users: [], tenants: [] };

async function makeTenant(name: string): Promise<Fixture> {
  const email = `${name}-${Date.now()}@test.local`;
  const password = "Password123!";

  const { data: user, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userErr) throw userErr;
  created.users.push(user.user.id);

  const { data: tenant, error: tErr } = await admin
    .from("tenants")
    .insert({ slug: `${name}-${Date.now()}`, name, status: "ACTIVE" })
    .select("id")
    .single();
  if (tErr) throw tErr;
  created.tenants.push(tenant.id);

  await admin
    .from("tenant_users")
    .insert({ tenant_id: tenant.id, user_id: user.user.id, role: "OWNER" });

  const mediaPath = `${tenant.id}/2026/01/${crypto.randomUUID()}.txt`;
  await admin.storage
    .from("tenant-media")
    .upload(mediaPath, new Blob([`secreto de ${name}`]), { contentType: "text/plain" });

  const { data: media } = await admin
    .from("media")
    .insert({
      tenant_id: tenant.id,
      bucket: "tenant-media",
      path: mediaPath,
      mime_type: "text/plain",
      size_bytes: 20,
      alt_text: `archivo de ${name}`,
      uploaded_by: user.user.id,
    })
    .select("id")
    .single();

  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return {
    tenantId: tenant.id,
    userId: user.user.id,
    client,
    mediaId: media!.id,
    mediaPath,
  };
}

let a: Fixture;
let b: Fixture;

beforeAll(async () => {
  [a, b] = await Promise.all([makeTenant("alpha"), makeTenant("beta")]);
}, 60_000);

afterAll(async () => {
  await admin.from("tenants").delete().in("id", created.tenants);
  await Promise.all(created.users.map((id) => admin.auth.admin.deleteUser(id)));
});

describe("PostgREST", () => {
  it("no devuelve archivos de otro espacio ni pidiéndolos por id", async () => {
    const { data } = await a.client.from("media").select("*").eq("id", b.mediaId);
    expect(data).toEqual([]);
  });

  it("no filtra datos ajenos a través de un embed de relaciones", async () => {
    // Vector clásico: la tabla raíz está protegida, la anidada no.
    const { data } = await a.client
      .from("media")
      .select("id, tenant:tenants(id, slug, limits), autor:users_profiles(email)");

    // El embed llega como objeto o array según la cardinalidad que infiera
    // PostgREST; se normaliza antes de comparar.
    const tenantIds = new Set(
      (data ?? []).flatMap((r) => {
        const t = r.tenant as unknown as { id: string } | { id: string }[] | null;
        if (!t) return [];
        return Array.isArray(t) ? t.map((x) => x.id) : [t.id];
      }),
    );
    expect([...tenantIds]).toEqual([a.tenantId]);
  });

  it("no permite escribir en el espacio ajeno", async () => {
    const { error } = await a.client.from("media").insert({
      tenant_id: b.tenantId,
      bucket: "tenant-media",
      path: `${b.tenantId}/2026/01/intruso.txt`,
      mime_type: "text/plain",
      size_bytes: 1,
    });
    expect(error).not.toBeNull();
  });

  it("un UPDATE cruzado no afecta a ninguna fila", async () => {
    await a.client.from("media").update({ alt_text: "HACKED" }).eq("id", b.mediaId);
    const { data } = await admin.from("media").select("alt_text").eq("id", b.mediaId).single();
    expect(data!.alt_text).not.toBe("HACKED");
  });

  it("la vista de plataforma no deja ver los contadores de otro espacio", async () => {
    // `security_invoker`: si algún día se creara sin él, la vista pasaría a
    // correr con los privilegios de su dueño y expondría a todos los clientes.
    const { data } = await a.client
      .from("platform_tenant_overview")
      .select("id")
      .eq("id", b.tenantId);
    expect(data).toEqual([]);
  });

  it("el anónimo no alcanza las tablas de negocio", async () => {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const { data, error } = await anon.from("media").select("id");
    expect(error ?? data).not.toEqual(expect.arrayContaining([expect.anything()]));
  });
});

describe("Storage", () => {
  it("no descarga objetos de otro tenant", async () => {
    const { data, error } = await a.client.storage.from("tenant-media").download(b.mediaPath);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("no firma URLs de objetos de otro tenant", async () => {
    const { data } = await a.client.storage
      .from("tenant-media")
      .createSignedUrl(b.mediaPath, 60);
    expect(data?.signedUrl).toBeUndefined();
  });

  it("no lista el directorio de otro tenant", async () => {
    const { data } = await a.client.storage.from("tenant-media").list(b.tenantId);
    expect(data ?? []).toEqual([]);
  });

  it("no escribe fuera de su propio prefijo", async () => {
    const { error } = await a.client.storage
      .from("tenant-media")
      .upload(`${b.tenantId}/2026/08/inyectado.txt`, new Blob(["x"]));
    expect(error).not.toBeNull();
  });
});
