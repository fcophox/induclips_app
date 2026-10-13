"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Film, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { CapsuleThumb } from "@/components/indulearn/capsule-card";
import { Badge, BrandBadge, Card, EmptyState, PageHeader, Select } from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { playsByCapsule } from "@/lib/indulearn/analytics";
import { formatDate, formatDuration, formatNumber } from "@/lib/indulearn/format";
import { deleteCapsule, setCapsulePublished, toast, useAppState } from "@/lib/indulearn/store";
import type { Capsule } from "@/lib/indulearn/types";

import { CapsuleForm } from "./capsule-form";

export default function CapsulesAdminPage() {
  const state = useAppState();
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // `null` cerrado · "new" creando · una cápsula, editándola.
  const [editing, setEditing] = useState<Capsule | "new" | null>(null);
  const [deleting, setDeleting] = useState<Capsule | null>(null);

  const plays = useMemo(() => playsByCapsule(state), [state]);
  const brands = state.brands.filter((brand) => brand.status === "active");

  const rows = state.capsules.filter(
    (capsule) =>
      capsule.title.toLowerCase().includes(query.trim().toLowerCase()) &&
      (brandFilter === "all" || capsule.brandIds.includes(brandFilter)) &&
      (statusFilter === "all" || capsule.status === statusFilter),
  );

  function togglePublished(capsule: Capsule) {
    const publish = capsule.status !== "published";
    setCapsulePublished(capsule.id, publish);
    toast(publish ? "Cápsula publicada: ya la ven los colaboradores de sus marcas" : "Cápsula despublicada");
  }

  function actions(capsule: Capsule) {
    const isPublished = capsule.status === "published";
    return (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" aria-label={`Editar ${capsule.title}`} title="Editar" onClick={() => setEditing(capsule)}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${isPublished ? "Despublicar" : "Publicar"} ${capsule.title}`}
          title={isPublished ? "Despublicar" : "Publicar"}
          onClick={() => togglePublished(capsule)}
        >
          {isPublished ? <EyeOff /> : <Eye />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Eliminar ${capsule.title}`}
          title="Eliminar"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleting(capsule)}
        >
          <Trash2 />
        </Button>
      </div>
    );
  }

  const statusBadge = (capsule: Capsule) =>
    capsule.status === "published" ? <Badge tone="success">Publicada</Badge> : <Badge tone="warn">Borrador</Badge>;

  const brandBadges = (capsule: Capsule) => (
    <span className="flex flex-wrap gap-1.5">
      {state.brands
        .filter((brand) => capsule.brandIds.includes(brand.id))
        .map((brand) => (
          <BrandBadge key={brand.id} brand={brand} />
        ))}
    </span>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestión de cápsulas"
        description="Publica contenido y decide qué marcas pueden verlo."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus />
            Crear cápsula
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar por título"
            placeholder="Buscar por título"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="bg-card pl-9"
          />
        </div>
        <Select aria-label="Filtrar por marca" value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
          <option value="all">Todas las marcas</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="published">Publicadas</option>
          <option value="draft">Borradores</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Film}
          title={state.capsules.length === 0 ? "Todavía no hay cápsulas" : "Ninguna cápsula coincide"}
          description={
            state.capsules.length === 0
              ? "Crea la primera cápsula para empezar a distribuir contenido."
              : "Prueba con otro título o cambia los filtros."
          }
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus />
              Crear cápsula
            </Button>
          }
        />
      ) : (
        <>
          {/* Escritorio: tabla. */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">Cápsula</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Marcas</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Categoría</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Duración</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Publicación</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Visualizaciones</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((capsule) => (
                    <tr key={capsule.id} className="text-sm text-foreground">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CapsuleThumb capsule={capsule} hasDuration={false} className="w-10 shrink-0" />
                          <span className="line-clamp-2 max-w-56 font-medium leading-snug">{capsule.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{brandBadges(capsule)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{capsule.category}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDuration(capsule.durationSec)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {capsule.status === "published" ? formatDate(capsule.publishedAt) : "—"}
                      </td>
                      <td className="px-4 py-3">{statusBadge(capsule)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNumber(plays.get(capsule.id) ?? 0)}</td>
                      <td className="px-4 py-3">{actions(capsule)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Móvil: la misma información en tarjetas. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((capsule) => (
              <li key={capsule.id}>
                <Card className="p-4">
                  <div className="flex gap-3">
                    <CapsuleThumb capsule={capsule} className="w-14 shrink-0 self-start" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{capsule.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {capsule.category} · {formatNumber(plays.get(capsule.id) ?? 0)} visualizaciones
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {brandBadges(capsule)}
                    {statusBadge(capsule)}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">
                      {capsule.status === "published" ? `Publicada el ${formatDate(capsule.publishedAt)}` : "Sin publicar"}
                    </span>
                    {actions(capsule)}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing !== null && (
        <CapsuleForm
          // La `key` da un formulario limpio cada vez que cambia la cápsula.
          key={editing === "new" ? "new" : editing.id}
          capsule={editing === "new" ? null : editing}
          brands={brands}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        variant="destructive"
        title="Eliminar cápsula"
        description={
          deleting
            ? `"${deleting.title}" dejará de estar disponible para todos los colaboradores. Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            deleteCapsule(deleting.id);
            toast("Cápsula eliminada");
          }
          setDeleting(null);
        }}
      />
    </div>
  );
}
