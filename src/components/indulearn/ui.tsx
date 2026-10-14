"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { initialsOf } from "@/lib/indulearn/format";
import { dismissToast, useToasts } from "@/lib/indulearn/store";
import type { Brand, CapsuleState } from "@/lib/indulearn/types";
import { cn } from "@/lib/utils";

import { BrandMark, BrandWordmark } from "./brand-logo";

/**
 * Piezas de interfaz propias de Inducampus online. Todas se pintan con los tokens del
 * sistema de diseño (tokens.yml), así que siguen el tema claro/oscuro sin
 * código adicional.
 */

// ── Identidad ─────────────────────────────────────────────────────────────

/** Logotipo completo; `compact` muestra sólo el isotipo (el del favicon). */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center", className)}>
      {compact ? (
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px]">
          <BrandMark className="size-full" />
        </span>
      ) : (
        <BrandWordmark className="h-8" />
      )}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/**
 * Etiqueta de marca. El color identifica, pero nunca va solo: el nombre
 * siempre acompaña al punto, en tinta de texto y no en el color de la serie.
 */
export function BrandBadge({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: brand.colorVar }} aria-hidden />
      {brand.name}
      {brand.isDemo && <span className="text-muted-foreground">· demo</span>}
    </span>
  );
}

// ── Contenedores y texto ──────────────────────────────────────────────────

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border bg-card text-card-foreground", className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary",
  success: "bg-success-surface text-success-foreground",
  warn: "bg-warn-surface text-warn-foreground",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof BADGE_TONES }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

const STATE_LABEL: Record<CapsuleState, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  completed: "Completada",
};

const STATE_TONE: Record<CapsuleState, keyof typeof BADGE_TONES> = {
  pending: "neutral",
  in_progress: "info",
  completed: "success",
};

export function StateBadge({ state, className }: { state: CapsuleState; className?: string }) {
  return (
    <Badge tone={STATE_TONE[state]} className={className}>
      {state === "completed" && <Check className="size-3" aria-hidden />}
      {STATE_LABEL[state]}
    </Badge>
  );
}

export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  /** Nombre accesible de la barra. */
  label: string;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-2 text-sm leading-snug text-muted-foreground">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

// ── Controles ─────────────────────────────────────────────────────────────

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 min-w-0 rounded-[var(--radius)] border bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow]",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Recibe el id que debe llevar el control para quedar asociado a la etiqueta. */
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={id} className="text-sm font-medium text-foreground">
          {label}
        </p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

/** Filtro de selección única en forma de píldoras, desplazable en móvil. */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: string; dot?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("il-no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1", className)}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {option.dot && (
              <span
                className={cn("size-2 rounded-full", isActive && "ring-2 ring-primary-foreground/70")}
                style={{ backgroundColor: option.dot }}
                aria-hidden
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Selección múltiple de marcas: casillas con aspecto de píldora. */
export function BrandMultiSelect({
  brands,
  value,
  onChange,
  legend,
}: {
  brands: Brand[];
  value: string[];
  onChange: (next: string[]) => void;
  legend: string;
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {brands.map((brand) => {
          const isChecked = value.includes(brand.id);
          return (
            <label
              key={brand.id}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors",
                "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                isChecked ? "border-primary bg-primary/10 text-foreground" : "bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggle(brand.id)} />
              <span className="size-2 rounded-full" style={{ backgroundColor: brand.colorVar }} aria-hidden />
              {brand.name}
              {isChecked && <Check className="size-3.5 text-primary" aria-hidden />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-backdrop-in fixed inset-0 bg-background/60 backdrop-blur-xs" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "animate-modal-in relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border bg-card shadow-lg outline-none sm:rounded-2xl",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ── Avisos ────────────────────────────────────────────────────────────────

const TOAST_ICON = { success: CheckCircle2, info: Info, error: CircleAlert } as const;

const TOAST_COLOR = {
  success: "text-success-foreground",
  info: "text-primary",
  error: "text-destructive",
} as const;

export function Toaster() {
  const toasts = useToasts();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-96 lg:px-0"
    >
      {toasts.map((item) => {
        const Icon = TOAST_ICON[item.tone];
        return (
          <div
            key={item.id}
            role="status"
            className="animate-il-toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-foreground shadow-lg"
          >
            <Icon className={cn("size-4 shrink-0", TOAST_COLOR[item.tone])} aria-hidden />
            <span className="min-w-0 flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="Cerrar aviso"
              className="shrink-0 rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
