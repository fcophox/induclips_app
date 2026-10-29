"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
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
  { href: "/indulearn/explorar", label: "Explorar", icon: CirclePlay },
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
  const isCollapsed = useContext(SidebarCollapsedContext);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      // Con el menú plegado sólo queda el icono: el title dice adónde lleva.
      title={isCollapsed ? item.label : undefined}
      className={cn(
        // 15px de margen centran el icono de 18px en el ancho plegado (48px).
        "flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-[15px] py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      <span className={SIDEBAR_FADE}>{item.label}</span>
    </Link>
  );
}

// ── Menú lateral plegable (escritorio) ────────────────────────────────────

const SIDEBAR_STORAGE_KEY = "indulearn:sidebar-collapsed";

/** Curva y duración que comparten el menú y el contenido, para que se muevan juntos. */
const SIDEBAR_MOTION = "duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

/**
 * Lo que sólo se ve con el menú abierto. Al plegar se apaga rápido, antes de
 * que el ancho lo recorte; al abrir aparece con un pequeño retraso, cuando ya
 * hay sitio.
 */
const SIDEBAR_FADE =
  "min-w-0 truncate transition-opacity delay-100 duration-200 motion-reduce:transition-none group-data-[collapsed=true]/sidebar:pointer-events-none group-data-[collapsed=true]/sidebar:opacity-0 group-data-[collapsed=true]/sidebar:delay-0 group-data-[collapsed=true]/sidebar:duration-100";

const SidebarCollapsedContext = createContext(false);

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Estado del menú plegado: se recuerda en este navegador y responde a ⌘B / Ctrl+B. */
function useSidebarCollapsed() {
  // Se lee al crear el estado y no en un efecto: así no se ve el menú abrirse
  // y plegarse al cargar. En el servidor siempre se pinta el esqueleto.
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = useCallback(() => setIsCollapsed((current) => !current), []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, isCollapsed ? "1" : "0");
    } catch {
      // Sin almacenamiento el menú se pliega igual; sólo no se recuerda.
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "b" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      toggle();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return { isCollapsed, toggle };
}

/** Margen del contenido, que acompaña al ancho del menú. */
function sidebarOffset(isCollapsed: boolean): string {
  return cn("transition-[padding-left]", SIDEBAR_MOTION, isCollapsed ? "lg:pl-[4.5rem]" : "lg:pl-64");
}

function DesktopSidebar({
  isCollapsed,
  onToggle,
  homeHref,
  badge,
  footer,
  children,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  homeHref: string;
  badge?: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const label = isCollapsed ? "Expandir menú" : "Contraer menú";
  return (
    <aside
      data-collapsed={isCollapsed}
      className={cn(
        "group/sidebar fixed inset-y-0 left-0 z-30 hidden flex-col bg-background transition-[width] lg:flex",
        SIDEBAR_MOTION,
        isCollapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      <SidebarCollapsedContext.Provider value={isCollapsed}>
        <div className="group/header relative flex h-16 shrink-0 items-center gap-2 overflow-hidden px-5">
          <Link
            href={homeHref}
            aria-label="Inducampus online, ir al inicio"
            className={cn(
              "relative h-8 shrink-0 overflow-hidden rounded-lg outline-none transition-[width] focus-visible:ring-[3px] focus-visible:ring-ring/50",
              SIDEBAR_MOTION,
              // 148px es el ancho del logotipo completo a 32px de alto.
              isCollapsed ? "w-8" : "w-[148px]",
            )}
          >
            <Logo
              className={cn(
                "absolute left-0 top-0 transition-opacity duration-200 motion-reduce:transition-none",
                isCollapsed && "opacity-0",
              )}
            />
            <Logo
              compact
              className={cn(
                "absolute left-0 top-0 transition-[opacity,scale] duration-200 motion-reduce:transition-none",
                !isCollapsed && "opacity-0",
                // Plegado, el isotipo cede su sitio al botón de expandir al pasar por encima.
                isCollapsed &&
                  "group-hover/header:scale-75 group-hover/header:opacity-0 group-has-[button:focus-visible]/header:scale-75 group-has-[button:focus-visible]/header:opacity-0",
              )}
            />
          </Link>
          {badge && <span className={cn(SIDEBAR_FADE, "shrink-0")}>{badge}</span>}

          {/* Abierto, el botón va al final de la cabecera; plegado, aparece encima
              del isotipo sólo al pasar por encima (o al llegar con el teclado). */}
          <button
            type="button"
            onClick={onToggle}
            aria-label={label}
            aria-expanded={!isCollapsed}
            aria-keyshortcuts="Meta+B Control+B"
            title={`${label} (⌘B)`}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,opacity,scale] duration-200 hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-90 motion-reduce:transition-none",
              isCollapsed
                ? "absolute left-5 top-4 scale-75 opacity-0 group-hover/header:scale-100 group-hover/header:opacity-100 focus-visible:scale-100 focus-visible:opacity-100"
                : "ml-auto",
            )}
          >
            {isCollapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <PanelLeftClose className="size-4" aria-hidden />}
          </button>
        </div>

        {children}
        <div className="p-3">{footer}</div>
      </SidebarCollapsedContext.Provider>
    </aside>
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
          className={cn(
            "flex w-full items-center gap-3 overflow-hidden rounded-xl border bg-card p-2.5 text-left outline-none transition-[padding,background-color,border-color] hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
            SIDEBAR_MOTION,
            "group-data-[collapsed=true]/sidebar:border-transparent group-data-[collapsed=true]/sidebar:bg-transparent group-data-[collapsed=true]/sidebar:p-[5px]",
          )}
        >
          <Avatar name={user.name} />
          <span className={cn(SIDEBAR_FADE, "flex-1")}>
            <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</span>
          </span>
          <ChevronsUpDown className={cn(SIDEBAR_FADE, "size-4 shrink-0 text-muted-foreground")} aria-hidden />
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
  const sidebar = useSidebarCollapsed();

  if (!isReady || !user) return <ShellSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <DesktopSidebar
        isCollapsed={sidebar.isCollapsed}
        onToggle={sidebar.toggle}
        homeHref={COLLABORATOR_HOME}
        footer={<AccountMenu user={user} placement="top" />}
      >
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
      </DesktopSidebar>

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

      <main className={cn("pb-16 lg:pb-0", sidebarOffset(sidebar.isCollapsed))}>
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
  const sidebar = useSidebarCollapsed();

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
      <DesktopSidebar
        isCollapsed={sidebar.isCollapsed}
        onToggle={sidebar.toggle}
        homeHref="/indulearn/admin"
        badge={
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Admin
          </span>
        }
        footer={<AccountMenu user={user} placement="top" />}
      >
        {nav()}
      </DesktopSidebar>

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

      <main className={sidebarOffset(sidebar.isCollapsed)}>
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
