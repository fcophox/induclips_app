"use client";

import { useState } from "react";
import { Pencil, Plus, Search, Users } from "lucide-react";

import { ROLE_LABEL } from "@/components/indulearn/shells";
import { Avatar, Badge, BrandBadge, Card, EmptyState, PageHeader, Select } from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/indulearn/store";
import type { User } from "@/lib/indulearn/types";

import { UserForm } from "./user-form";

export default function UsersAdminPage() {
  const state = useAppState();
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editing, setEditing] = useState<User | "new" | null>(null);

  const brands = state.brands.filter((brand) => brand.status === "active");
  const needle = query.trim().toLowerCase();

  const rows = state.users.filter(
    (user) =>
      (user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle)) &&
      (brandFilter === "all" || user.brandIds.includes(brandFilter)) &&
      (roleFilter === "all" || user.role === roleFilter),
  );

  const statusBadge = (user: User) =>
    user.status === "active" ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>;

  const brandBadges = (user: User) =>
    user.role === "admin" ? (
      <span className="text-sm text-muted-foreground">Todas las marcas</span>
    ) : (
      <span className="flex flex-wrap gap-1.5">
        {state.brands
          .filter((brand) => user.brandIds.includes(brand.id))
          .map((brand) => (
            <BrandBadge key={brand.id} brand={brand} />
          ))}
      </span>
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Quién accede a la plataforma y a qué marcas. Un colaborador puede tener varias."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus />
            Agregar usuario
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar por nombre o correo"
            placeholder="Buscar por nombre o correo"
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
        <Select aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">Todos los roles</option>
          <option value="admin">{ROLE_LABEL.admin}</option>
          <option value="collaborator">{ROLE_LABEL.collaborator}</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Ningún usuario coincide"
          description="Prueba con otro nombre o cambia los filtros."
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">Nombre</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Rol</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Concesionario</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Marcas asignadas</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((user) => (
                    <tr key={user.id} className="text-sm text-foreground">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{ROLE_LABEL[user.role]}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.dealer}</td>
                      <td className="px-4 py-3">{brandBadges(user)}</td>
                      <td className="px-4 py-3">{statusBadge(user)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(user)}>
                          <Pencil />
                          Editar
                          <span className="sr-only"> a {user.name}</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((user) => (
              <li key={user.id}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {statusBadge(user)}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {ROLE_LABEL[user.role]} · {user.dealer}
                  </p>
                  <div className="mt-2">{brandBadges(user)}</div>
                  <div className="mt-3 flex justify-end border-t pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(user)}>
                      <Pencil />
                      Editar
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing !== null && (
        <UserForm
          key={editing === "new" ? "new" : editing.id}
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
