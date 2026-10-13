"use client";

import { Film, Users } from "lucide-react";

import { Badge, Card, PageHeader } from "@/components/indulearn/ui";
import { collaborators } from "@/lib/indulearn/selectors";
import { useAppState } from "@/lib/indulearn/store";

export default function BrandsAdminPage() {
  const state = useAppState();
  const people = collaborators(state);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marcas"
        description="Las marcas organizan el contenido y los permisos: cada cápsula y cada colaborador pertenece a una o varias."
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
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-slate-950"
                    style={{ backgroundColor: brand.colorVar }}
                    aria-hidden
                  >
                    {brand.short}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-foreground">{brand.name}</h2>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {brand.status === "active" ? <Badge tone="success">Activa</Badge> : <Badge tone="warn">Pendiente</Badge>}
                      {brand.isDemo && <Badge>Demostrativa</Badge>}
                    </div>
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
    </div>
  );
}
