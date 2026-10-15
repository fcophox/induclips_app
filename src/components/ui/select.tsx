import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  /** `sm` para selects dentro de filas de tabla o listas densas. */
  size?: "default" | "sm";
};

/**
 * Select nativo con el chevrón propio del sistema: el del navegador cambia de
 * forma y posición según el sistema operativo y queda pegado al borde.
 *
 * `className` va al contenedor, que es lo que se ubica en el layout (ancho,
 * márgenes); el `<select>` lo llena. Todo select nuevo debería usar este.
 */
function Select({ className, size = "default", disabled, ...props }: SelectProps) {
  const isSmall = size === "sm";
  return (
    <span
      data-slot="select"
      data-disabled={disabled ? "" : undefined}
      className={cn("group/select relative inline-flex min-w-0 items-center", className)}
    >
      <select
        disabled={disabled}
        className={cn(
          "w-full min-w-0 cursor-pointer appearance-none truncate rounded-[var(--radius)] border bg-card text-foreground shadow-xs outline-none transition-[color,background-color,box-shadow]",
          "hover:bg-accent/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-card",
          // El texto deja sitio al chevrón: nunca se montan.
          isSmall ? "h-8 pl-2.5 pr-8 text-xs font-medium" : "h-9 pl-3 pr-9 text-sm",
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className={cn(
          "pointer-events-none absolute text-muted-foreground transition-colors group-hover/select:text-foreground group-data-[disabled]/select:opacity-50",
          isSmall ? "right-2.5 size-3.5" : "right-3 size-4",
        )}
      />
    </span>
  );
}

export { Select };
