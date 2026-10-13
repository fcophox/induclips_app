"use client";

import { useState } from "react";

import { ROLE_LABEL } from "@/components/indulearn/shells";
import { BrandMultiSelect, Field, Modal, Select } from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEALERS } from "@/lib/indulearn/seed";
import { newId, toast, upsertUser, useAppState, useCurrentUser } from "@/lib/indulearn/store";
import type { Role, User, UserStatus } from "@/lib/indulearn/types";

const HEAD_OFFICE = "Casa matriz";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<"name" | "email" | "brands" | "status", string>>;

export function UserForm({ user, onClose }: { user: User | null; onClose: () => void }) {
  const state = useAppState();
  const current = useCurrentUser();
  const brands = state.brands.filter((brand) => brand.status === "active");

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "collaborator");
  const [dealer, setDealer] = useState(user?.dealer ?? DEALERS[0]);
  const [brandIds, setBrandIds] = useState<string[]>(user?.brandIds ?? []);
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "active");
  const [errors, setErrors] = useState<Errors>({});

  const isSelf = user !== null && user.id === current?.id;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const next: Errors = {};
    if (name.trim().length < 3) next.name = "Escribe el nombre completo.";
    if (!EMAIL_RE.test(cleanEmail)) next.email = "Escribe un correo válido.";
    else if (state.users.some((u) => u.id !== user?.id && u.email.toLowerCase() === cleanEmail)) {
      next.email = "Ya existe un usuario con ese correo.";
    }
    if (role === "collaborator" && brandIds.length === 0) {
      next.brands = "Asigna al menos una marca: sin marca no vería ningún contenido.";
    }
    // Evita que el administrador se quede fuera de su propia sesión.
    if (isSelf && (status !== "active" || role !== "admin")) {
      next.status = "No puedes desactivar ni cambiar el rol de tu propia cuenta.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    upsertUser({
      id: user?.id ?? newId("u"),
      name: name.trim(),
      email: cleanEmail,
      role,
      dealer: role === "admin" ? HEAD_OFFICE : dealer,
      // El administrador general ve todas las marcas por su rol, no por asignación.
      brandIds: role === "admin" ? brands.map((brand) => brand.id) : brandIds,
      status,
      lastActiveDaysAgo: user?.lastActiveDaysAgo ?? 0,
    });

    toast(user ? "Usuario actualizado" : "Usuario agregado");
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={user ? "Editar usuario" : "Agregar usuario"}
      description="Las marcas asignadas determinan qué cápsulas puede ver."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form">
            {user ? "Guardar cambios" : "Agregar usuario"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Nombre" error={errors.name}>
          {(id) => (
            <Input id={id} value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} />
          )}
        </Field>
        <Field label="Correo electrónico" error={errors.email}>
          {(id) => (
            <Input
              id={id}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Rol" hint="El rol de administrador de marca llegará en una versión posterior.">
            {(id) => (
              <Select id={id} value={role} onChange={(event) => setRole(event.target.value as Role)}>
                <option value="collaborator">{ROLE_LABEL.collaborator}</option>
                <option value="admin">{ROLE_LABEL.admin}</option>
                <option value="brand_admin" disabled>
                  {ROLE_LABEL.brand_admin} (próximamente)
                </option>
              </Select>
            )}
          </Field>
          <Field label="Estado" error={errors.status}>
            {(id) => (
              <Select id={id} value={status} onChange={(event) => setStatus(event.target.value as UserStatus)}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </Select>
            )}
          </Field>
        </div>

        {role === "admin" ? (
          <p className="rounded-lg border bg-background px-3 py-2.5 text-sm text-muted-foreground">
            El administrador general gestiona todas las marcas, usuarios y contenidos. No necesita marcas asignadas.
          </p>
        ) : (
          <>
            <Field label="Concesionario">
              {(id) => (
                <Select id={id} value={dealer} onChange={(event) => setDealer(event.target.value)}>
                  {[...new Set([...DEALERS, dealer])]
                    .filter((item) => item !== HEAD_OFFICE)
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
            <div>
              <BrandMultiSelect legend="Marcas asignadas" brands={brands} value={brandIds} onChange={setBrandIds} />
              {errors.brands && (
                <p role="alert" className="mt-1.5 text-xs text-destructive">
                  {errors.brands}
                </p>
              )}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
