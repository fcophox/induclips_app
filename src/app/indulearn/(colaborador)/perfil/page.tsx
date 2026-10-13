"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, LogOut, Mail, ShieldCheck } from "lucide-react";

import { ROLE_LABEL } from "@/components/indulearn/shells";
import { Avatar, BrandBadge, Card, PageHeader, ProgressBar } from "@/components/indulearn/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { brandsForUser, isAdmin, learningSummary } from "@/lib/indulearn/selectors";
import { logout, useAppState, useCurrentUser } from "@/lib/indulearn/store";

export default function ProfilePage() {
  const state = useAppState();
  const user = useCurrentUser();
  const router = useRouter();

  if (!user) return null;

  const brands = brandsForUser(state, user).filter((brand) => brand.status === "active");
  const summary = learningSummary(state, user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi perfil" description="Tus datos y las marcas para las que tienes contenido habilitado." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} className="size-14 text-base" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Correo electrónico</dt>
                <dd className="truncate text-sm text-foreground">{user.email}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <dt className="text-xs text-muted-foreground">Concesionario</dt>
                <dd className="text-sm text-foreground">{user.dealer}</dd>
              </div>
            </div>
          </dl>

          <div className="mt-6">
            <p className="text-xs text-muted-foreground">Marcas autorizadas</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brands.map((brand) => (
                <BrandBadge key={brand.id} brand={brand} />
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
              {isAdmin(user)
                ? "Como administrador general ves el contenido de todas las marcas."
                : "Sólo ves cápsulas de estas marcas. Si necesitas acceso a otra, pídelo a tu administrador."}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <p className="text-sm text-muted-foreground">Mi avance</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{summary.percent} %</p>
          <ProgressBar value={summary.percent} label="Progreso general" className="mt-3" />
          <p className="mt-3 text-sm text-muted-foreground">
            {summary.completed} de {summary.available} cápsulas completadas.
          </p>
          <Button asChild variant="outline" className="mt-auto">
            <Link href="/indulearn/aprendizaje">Ver mi aprendizaje</Link>
          </Button>
        </Card>
      </div>

      <Card className="divide-y">
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium text-foreground">Apariencia</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Alterna entre modo claro y modo oscuro.</p>
          </div>
          <ThemeToggle className="border" />
        </div>
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium text-foreground">Sesión</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Cierra la sesión para entrar con otro perfil demo.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              router.push("/indulearn");
            }}
          >
            <LogOut />
            Cerrar sesión
          </Button>
        </div>
      </Card>
    </div>
  );
}
