"use client";

import { useState } from "react";
import { Film, Pencil, Plus, Trash2, Users } from "lucide-react";

import { Badge, BrandAvatar, Card, PageHeader } from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { collaborators } from "@/lib/indulearn/selectors";
import { deleteBrand, toast, useAppState } from "@/lib/indulearn/store";
import type { AppState, Brand } from "@/lib/indulearn/types";

import { BrandForm } from "./brand-form";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Qué cambia al borrar la marca, para que el administrador decida sabiendo. */
function deleteImpact(state: AppState, brand: Brand): string {
  const capsules = state.capsules.filter((capsule) => capsule.brandIds.includes(brand.id));
  const orphanCapsules = capsules.filter((capsule) => capsule.brandIds.length === 1).length;
  // Sólo colaboradores, como en la tarjeta: los administradores ven todas las marcas.
  const users = collaborators(state).filter((user) => user.brandIds.includes(brand.id));
  const orphanUsers = users.filter((user) => user.brandIds.length === 1).length;

  const parts: string[] = [];
  if (capsules.length > 0) {
    parts.push(
      `Se quitará de ${plural(capsules.length, "cápsula", "cápsulas")}` +
        (orphanCapsules > 0
          ? `; ${plural(orphanCapsules, "quedará", "quedarán")} sin marca y ningún colaborador podrá verla${orphanCapsules === 1 ? "" : "s"} hasta que le asignes otra.`
          : "."),
    );
  }
  if (users.length > 0) {
    parts.push(
      `${plural(users.length, "colaborador pierde", "colaboradores pierden")} el acceso a su contenido` +
        (orphanUsers > 0 ? ` (${plural(orphanUsers, "se queda", "se quedan")} sin ninguna marca).` : "."),
    );
  }
  if (parts.length === 0) parts.push("No tiene cápsulas ni colaboradores asignados.");
  return `${parts.join(" ")} Esta acción no se puede deshacer.`;
}

export default function BrandsAdminPage() {
  const state = useAppState();
  const people = collaborators(state);
  // `null` = crear; una marca = editarla; `undefined` = formulario cerrado.
  const [editing, setEditing] = useState<Brand | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Brand | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marcas"
        description="Las marcas organizan el contenido y los permisos: cada cápsula y cada colaborador pertenece a una o varias."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus />
            Agregar marca
          </Button>
        }
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {state.brands.map((brand) => {
          const members = people.filter((user) => user.brandIds.includes(brand.id)).length;
          const capsules = state.capsules.filter(
            (capsule) => capsule.status === "published" && capsule.brandIds.includes(brand.id),
          ).length;

          return (
            <li key={brand.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start gap-3">
                  <BrandAvatar brand={brand} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-foreground">{brand.name}</h2>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {brand.status === "active" ? <Badge tone="success">Activa</Badge> : <Badge tone="warn">Pendiente</Badge>}
                      {brand.isDemo && <Badge>Demostrativa</Badge>}
                    </div>
                  </div>
                  <div className="-mr-2 -mt-1 flex shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setEditing(brand)}
                      aria-label={`Editar ${brand.name}`}
                      title="Editar"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleting(brand)}
                      aria-label={`Borrar ${brand.name}`}
                      title="Borrar"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" aria-hidden />
                      Colaboradores
                    </dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{members}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Film className="size-3.5" aria-hidden />
                      Cápsulas disponibles
                    </dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{capsules}</dd>
                  </div>
                </dl>

                {brand.isDemo && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Marca ficticia, incluida para mostrar cómo crece el sistema al incorporar nuevas marcas.
                  </p>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      {editing !== undefined && <BrandForm brand={editing} existing={state.brands} onClose={() => setEditing(undefined)} />}

      <ConfirmDialog
        isOpen={deleting !== null}
        variant="destructive"
        icon={Trash2}
        title={deleting ? `¿Borrar la marca «${deleting.name}»?` : ""}
        description={deleting ? deleteImpact(state, deleting) : ""}
        confirmText="Sí, borrar marca"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          deleteBrand(deleting.id);
          toast(`Marca «${deleting.name}» borrada`);
          setDeleting(null);
        }}
      />
    </div>
  );
}
