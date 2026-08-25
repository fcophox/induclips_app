"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  LayoutDashboard,
  Users,
  Palette,
  UserRound,
} from "lucide-react";

type SegmentMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * Un segmento sin entrada aquí no produce miga: es preferible una ruta muda a
 * una miga que invente un nombre. Al añadir una sección al menú lateral,
 * añádela también aquí o su pantalla aparecerá sin rastro de navegación.
 */
const SEGMENTS: Record<string, SegmentMeta> = {
  team: { label: "Equipo", icon: Users },
  profile: { label: "Perfil", icon: UserRound },
  branding: { label: "Marca", icon: Palette },
};

type Crumb = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

export function BreadcrumbBar({
  tenantSlug,
  onToggleSidebar,
  isSidebarOpen = false,
}: {
  tenantSlug: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}) {
  const pathname = usePathname();
  const base = `/${tenantSlug}`;
  const rest = pathname.slice(base.length).replace(/^\//, "");
  const rawSegments = rest ? rest.split("/") : [];

  const crumbs: Crumb[] = [];

  if (rawSegments.length === 0) {
    // Portada del espacio
    crumbs.push({ label: "Resumen", icon: LayoutDashboard, href: base });
  } else {
    let path = base;
    for (const seg of rawSegments) {
      path += `/${seg}`;
      const meta = SEGMENTS[seg];
      if (meta) crumbs.push({ ...meta, href: path });
    }
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
      <button
        onClick={onToggleSidebar}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label={
          isSidebarOpen ? "Colapsar barra lateral" : "Abrir barra lateral"
        }
        aria-expanded={isSidebarOpen}
      >
        {isSidebarOpen ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeftOpen className="size-4" />
        )}
      </button>
      <div className="h-4 w-px bg-border" />
      <nav
        className="flex items-center gap-1.5 text-sm"
        aria-label="Breadcrumb"
      >
        {crumbs.map((crumb, i) => {
          const Icon = crumb.icon;
          const isLast = i === crumbs.length - 1;

          return (
            <Fragment key={crumb.href}>
              {i > 0 && (
                <ChevronRight className="size-3 text-muted-foreground/40" />
              )}
              {isLast ? (
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Icon className="size-4 text-muted-foreground" />
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="size-4" />
                  {crumb.label}
                </Link>
              )}
            </Fragment>
          );
        })}
      </nav>
    </div>
  );
}
