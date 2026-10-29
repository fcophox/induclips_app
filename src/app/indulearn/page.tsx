"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, CirclePlay, ShieldCheck } from "lucide-react";

import { homeFor, ROLE_LABEL } from "@/components/indulearn/shells";
import { Avatar, BrandBadge, Field, Logo, Skeleton } from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { DEMO_PROFILE_IDS } from "@/lib/indulearn/seed";
import { login, useAppState, useCurrentUser, useHydrated } from "@/lib/indulearn/store";
import type { User } from "@/lib/indulearn/types";

const HIGHLIGHTS = [
  { icon: CirclePlay, text: "Cápsulas breves, pensadas para ver desde el teléfono." },
  { icon: ShieldCheck, text: "Cada colaborador ve sólo el contenido de sus marcas." },
  { icon: BarChart3, text: "Indicadores de participación para el equipo de capacitación." },
];

export default function LoginPage() {
  const state = useAppState();
  const hydrated = useHydrated();
  const current = useCurrentUser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Con un perfil ya elegido no tiene sentido volver a pedir acceso.
  useEffect(() => {
    if (hydrated && current) router.replace(homeFor(current));
  }, [hydrated, current, router]);

  function enter(user: User) {
    login(user.id);
    router.push(homeFor(user));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    // Acceso simulado: se comprueba que el correo exista, no la contraseña.
    if (!user || user.status !== "active" || password.length === 0) {
      setError("No encontramos una cuenta activa con esos datos. Puedes entrar con un perfil demo.");
      return;
    }
    enter(user);
  }

  const demoProfiles = DEMO_PROFILE_IDS.map((id) => state.users.find((u) => u.id === id)).filter(
    (user): user is User => user !== undefined,
  );

  if (!hydrated || current) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6" aria-busy="true">
        <Skeleton className="h-96 w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <main className="flex w-full flex-col justify-center px-5 py-10 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-foreground">
            Conocimiento que impulsa tu crecimiento
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Ingresa con tu cuenta corporativa para ver tus cápsulas.</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
            <Field label="Correo electrónico">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 bg-card"
                />
              )}
            </Field>
            <Field label="Contraseña">
              {(id) => (
                <PasswordInput
                  id={id}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="bg-card"
                />
              )}
            </Field>

            {error && (
              <p role="alert" className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-foreground">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-1 w-full">
              Ingresar
            </Button>

            <button
              type="button"
              onClick={() => setIsRecovering((value) => !value)}
              aria-expanded={isRecovering}
              className="self-center rounded text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              ¿Olvidaste tu contraseña?
            </button>
            {isRecovering && (
              <p className="rounded-lg border bg-card px-3 py-2.5 text-sm text-muted-foreground">
                En la versión final recibirás un enlace de recuperación en tu correo corporativo. En este prototipo
                la recuperación no está activa: usa un perfil demo.
              </p>
            )}
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              Perfiles demo
              <span className="h-px flex-1 bg-border" />
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {demoProfiles.map((profile) => (
                <li key={profile.id}>
                  <button
                    type="button"
                    onClick={() => enter(profile)}
                    className="group flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left outline-none transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <Avatar name={profile.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{profile.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {ROLE_LABEL[profile.role]}
                        {profile.role === "collaborator" &&
                          state.brands
                            .filter((brand) => profile.brandIds.includes(brand.id))
                            .map((brand) => <BrandBadge key={brand.id} brand={brand} />)}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Prototipo demostrativo. Los datos, usuarios y contenidos son ficticios y no constituyen material oficial
            de las marcas.
          </p>
        </div>
      </main>

      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-muted p-12 text-foreground dark:bg-black lg:flex">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-foreground/5 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-foreground/[0.03] blur-3xl" aria-hidden />

        <p className="relative text-sm font-medium text-foreground/80">Plataforma de microlearning multimarca</p>

        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Aprender del producto tan fácil como ver un video corto.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-foreground/90">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground/10">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-foreground/70">Inducampus online · Red comercial Indumotora</p>
      </aside>
    </div>
  );
}
