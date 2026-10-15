"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronsUpDown,
  CirclePlay,
  Film,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Repeat,
  Route,
  Settings,
  ShieldAlert,
  Sun,
  Tags,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEMO_PROFILE_IDS } from "@/lib/indulearn/seed";
import { isAdmin } from "@/lib/indulearn/selectors";
import { login, logout, toast, useAppState, useCurrentUser, useHydrated } from "@/lib/indulearn/store";
import type { Role, User } from "@/lib/indulearn/types";
import { THEME_STORAGE_KEY, applyTheme, type ThemeMode } from "@/lib/theme/mode";
import { cn } from "@/lib/utils";

import { Avatar, BrandBadge, EmptyState, Logo, Skeleton } from "./ui";

type NavItem = { href: string; label: string; shortLabel?: string; icon: LucideIcon; isExact?: boolean };

const COLLABORATOR_NAV: NavItem[] = [
  { href: "/indulearn/explorar", label: "Explorar cápsulas", shortLabel: "Explorar", icon: CirclePlay },
  { href: "/indulearn/mi-ruta", label: "Mi ruta", icon: Route },
  { href: "/indulearn/perfil", label: "Mi perfil", shortLabel: "Perfil", icon: UserRound },
];

/** La primera pantalla del colaborador es el feed de cápsulas. */
const COLLABORATOR_HOME = "/indulearn/explorar";

const ADMIN_NAV: NavItem[] = [
  { href: "/indulearn/admin", label: "Dashboard", icon: LayoutDashboard, isExact: true },
  { href: "/indulearn/admin/capsulas", label: "Gestión de cápsulas", icon: Film },
  { href: "/indulearn/admin/marcas", label: "Marcas", icon: Tags },
  { href: "/indulearn/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/indulearn/admin/indicadores", label: "Indicadores", icon: BarChart3 },
  { href: "/indulearn/admin/configuracion", label: "Configuración", icon: Settings },
];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador general",
  brand_admin: "Administrador de marca",
  collaborator: "Colaborador",
};

export function homeFor(user: User): string {
  return isAdmin(user) ? "/indulearn/admin" : COLLABORATOR_HOME;
}

function isCurrent(pathname: string, item: NavItem): boolean {
  return item.isExact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Sesión simulada: devuelve el usuario cuando ya se leyó localStorage, y manda
 * al acceso a quien no tiene perfil elegido. No es un control de seguridad.
 */
function useSession(): { user: User | null; isReady: boolean } {
  const hydrated = useHydrated();
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !user) router.replace("/indulearn");
  }, [hydrated, user, router]);

  return { user, isReady: hydrated && user !== null };
}

function ShellSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function SidebarLink({ item, isActive, onNavigate }: { item: NavItem; isActive: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

// ── Menú de cuenta ────────────────────────────────────────────────────────

/**
 * Acciones de cuenta (tema, cambio de perfil demo, cierre de sesión). Las
 * comparten el menú de la barra lateral y el panel del menú hamburguesa.
 */
function useAccountActions(user: User, onDone: () => void) {
  const state = useAppState();
  const router = useRouter();
  const [mode, setMode] = useState<ThemeMode>("light");

  // El tema real vive en la clase del <html>: se lee al abrir, no al montar.
  function syncMode() {
    setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }

  function toggleTheme() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento el tema cambia igual; sólo no persiste.
    }
  }

  function switchTo(next: User) {
    onDone();
    login(next.id);
    toast(`Ahora ves la plataforma como ${next.name}`, "info");
    router.push(homeFor(next));
  }

  function signOut() {
    onDone();
    logout();
    router.push("/indulearn");
  }

  const demoProfiles = state.users.filter(
    (profile) => (DEMO_PROFILE_IDS as readonly string[]).includes(profile.id) && profile.id !== user.id,
  );

  return { mode, syncMode, toggleTheme, switchTo, signOut, demoProfiles };
}

const ACCOUNT_ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent";

function AccountMenu({ user, placement }: { user: User; placement: "top" | "bottom" }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { mode, syncMode, toggleTheme, switchTo, signOut, demoProfiles } = useAccountActions(user, () =>
    setIsOpen(false),
  );

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function toggleMenu() {
    if (!isOpen) syncMode();
    setIsOpen(!isOpen);
  }

  const itemClass = ACCOUNT_ITEM;

  return (
    <div className="relative" ref={rootRef}>
      {placement === "top" ? (
        <button
          type="button"
          onClick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="flex w-full items-center gap-3 rounded-xl border bg-card p-2.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Avatar name={user.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Cuenta de ${user.name}`}
          className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Avatar name={user.name} />
        </button>
      )}

      {isOpen && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 flex w-64 flex-col gap-0.5 rounded-xl border bg-popover p-1.5 shadow-lg",
            placement === "top" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2",
          )}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />

          <Link href="/indulearn/perfil" role="menuitem" className={itemClass} onClick={() => setIsOpen(false)}>
            <UserRound className="size-4" aria-hidden />
            Mi perfil
          </Link>
          <button type="button" role="menuitem" className={itemClass} onClick={toggleTheme}>
            {mode === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
            {mode === "dark" ? "Modo claro" : "Modo oscuro"}
          </button>

          {demoProfiles.length > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Cambiar perfil demo
              </p>
              {demoProfiles.map((profile) => (
                <button key={profile.id} type="button" role="menuitem" className={itemClass} onClick={() => switchTo(profile)}>
                  <Repeat className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate">{profile.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</span>
                  </span>
                </button>
              ))}
            </>
          )}

          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className={cn(itemClass, "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10")}
          >
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

// ── Panel de cuenta (móvil) ───────────────────────────────────────────────

/**
 * Panel que entra desde la izquierda al pulsar el menú hamburguesa. Reúne los
 * datos y acciones de la cuenta, los mismos que ofrece el avatar de la
 * derecha, en un formato cómodo para el pulgar.
 */
function AccountDrawer({ user, isOpen, onClose }: { user: User; isOpen: boolean; onClose: () => void }) {
  const state = useAppState();
  const panelRef = useRef<HTMLDivElement>(null);
  const { mode, syncMode, toggleTheme, switchTo, signOut, demoProfiles } = useAccountActions(user, onClose);
  const brands = state.brands.filter((brand) => brand.status === "active" && user.brandIds.includes(brand.id));

  useEffect(() => {
    if (!isOpen) return;

    syncMode();
    panelRef.current?.focus();
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };

    // `syncMode` se recrea en cada render; sólo interesa reaccionar a abrir/cerrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="animate-backdrop-in absolute inset-0 bg-background/60 backdrop-blur-xs" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mi cuenta"
        tabIndex={-1}
        className="animate-drawer-in-left absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col border-r bg-card shadow-xl outline-none"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b pl-4 pr-2">
          <Logo />
          <Button variant="ghost" size="icon" aria-label="Cerrar menú" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b p-5">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} className="size-12 text-sm" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{ROLE_LABEL[user.role]}</p>
              </div>
            </div>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Correo electrónico</dt>
                <dd className="break-all text-foreground">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Concesionario</dt>
                <dd className="text-foreground">{user.dealer}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Marcas</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {brands.map((brand) => (
                    <BrandBadge key={brand.id} brand={brand} />
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-0.5 p-2">
            <Link href="/indulearn/perfil" className={cn(ACCOUNT_ITEM, "min-h-11")} onClick={onClose}>
              <UserRound className="size-4" aria-hidden />
              Mi perfil
            </Link>
            <button type="button" className={cn(ACCOUNT_ITEM, "min-h-11")} onClick={toggleTheme}>
              {mode === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
              {mode === "dark" ? "Modo claro" : "Modo oscuro"}
            </button>
          </div>

          {demoProfiles.length > 0 && (
            <div className="flex flex-col gap-0.5 border-t p-2">
              <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Cambiar perfil demo
              </p>
              {demoProfiles.map((profile) => (
                <button key={profile.id} type="button" className={cn(ACCOUNT_ITEM, "min-h-11")} onClick={() => switchTo(profile)}>
                  <Repeat className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate">{profile.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={signOut}
            className={cn(ACCOUNT_ITEM, "min-h-11 text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10")}
          >
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Portal del colaborador ────────────────────────────────────────────────

export function CollaboratorShell({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useSession();
  const pathname = usePathname();
  // El feed ocupa toda la pantalla: sin cabecera ni márgenes alrededor.
  const isImmersive = pathname.startsWith("/indulearn/explorar");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const closeAccount = useCallback(() => setIsAccountOpen(false), []);

  if (!isReady || !user) return <ShellSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href={COLLABORATOR_HOME} className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <Logo />
          </Link>
        </div>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3 py-2">
          {COLLABORATOR_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} isActive={isCurrent(pathname, item)} />
          ))}
          {isAdmin(user) && (
            <>
              <div className="my-2 h-px bg-border" />
              <SidebarLink
                item={{ href: "/indulearn/admin", label: "Panel administrativo", icon: LayoutDashboard }}
                isActive={false}
              />
            </>
          )}
        </nav>
        <div className="p-3">
          <AccountMenu user={user} placement="top" />
        </div>
      </aside>

      {!isImmersive && (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card pl-2 pr-4 lg:hidden">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menú de cuenta"
              aria-haspopup="dialog"
              aria-expanded={isAccountOpen}
              onClick={() => setIsAccountOpen(true)}
            >
              <Menu />
            </Button>
            <Link href={COLLABORATOR_HOME} className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <Logo />
            </Link>
          </div>
          {/* Sólo identifica la sesión: las acciones de cuenta están en el panel del menú. */}
          <Avatar name={user.name} />
        </header>
      )}

      <AccountDrawer user={user} isOpen={isAccountOpen} onClose={closeAccount} />

      <main className="pb-16 lg:pb-0 lg:pl-64">
        {isImmersive ? children : <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>}
      </main>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-3 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {COLLABORATOR_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = isCurrent(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none transition-colors focus-visible:bg-accent",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {item.shortLabel ?? item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ── Portal administrativo ─────────────────────────────────────────────────

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useSession();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!isReady || !user) return <ShellSkeleton />;

  // La navegación administrativa no existe para un colaborador: si llega por
  // URL, ve un aviso y no el panel.
  if (!isAdmin(user)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6">
        <EmptyState
          icon={ShieldAlert}
          title="Esta sección es sólo para administradores"
          description="Tu perfil de colaborador no tiene permisos para gestionar contenidos, usuarios ni indicadores."
          action={
            <Button asChild>
              <Link href={COLLABORATOR_HOME}>Volver al portal</Link>
            </Button>
          }
          className="w-full max-w-md"
        />
      </div>
    );
  }

  const nav = (onNavigate?: () => void) => (
    <nav aria-label="Administración" className="flex flex-1 flex-col gap-1 px-3 py-2">
      {ADMIN_NAV.map((item) => (
        <SidebarLink key={item.href} item={item} isActive={isCurrent(pathname, item)} onNavigate={onNavigate} />
      ))}
      <div className="my-2 h-px bg-border" />
      <SidebarLink
        item={{ href: COLLABORATOR_HOME, label: "Portal del colaborador", icon: House }}
        isActive={false}
        onNavigate={onNavigate}
      />
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <Logo />
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Admin
          </span>
        </div>
        {nav()}
        <div className="p-3">
          <AccountMenu user={user} placement="top" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Abrir menú" onClick={() => setIsDrawerOpen(true)}>
            <Menu />
          </Button>
          <Logo />
        </div>
        <AccountMenu user={user} placement="bottom" />
      </header>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-backdrop-in absolute inset-0 bg-background/60 backdrop-blur-xs" onClick={() => setIsDrawerOpen(false)} aria-hidden />
          <div className="relative flex h-full w-72 max-w-[85%] flex-col border-r bg-sidebar shadow-xl">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo />
              <Button variant="ghost" size="icon" aria-label="Cerrar menú" onClick={() => setIsDrawerOpen(false)}>
                <X />
              </Button>
            </div>
            {nav(() => setIsDrawerOpen(false))}
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
