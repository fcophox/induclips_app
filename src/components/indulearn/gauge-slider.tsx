"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Geometría del tacómetro, en unidades del viewBox (200 × 118). */
const CX = 100;
const CY = 100;
const RADIUS = 80;
const STROKE = 6;
const ARC = `M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`;

/** Punto del arco para una fracción 0–1 (0 = izquierda, 1 = derecha). */
function pointAt(fraction: number, radius = RADIUS): { x: number; y: number } {
  const angle = Math.PI * (1 - fraction);
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

/**
 * Slider en forma de tacómetro: media circunferencia que se completa según el
 * valor, con una perilla al final del avance. Se arrastra sobre el arco o se maneja con el teclado
 * (flechas, Re Pág / Av Pág, Inicio / Fin), como cualquier slider.
 */
export function GaugeSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  labelledBy,
  describedBy,
  unit = "%",
  caption,
  className,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  labelledBy: string;
  describedBy?: string;
  unit?: string;
  /** Texto bajo la cifra, dentro del arco. */
  caption?: string;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fraction = (value - min) / (max - min);
  const knob = pointAt(fraction);
  const ticks = Math.round((max - min) / step);

  function clampToStep(raw: number): number {
    const snapped = min + Math.round((raw - min) / step) * step;
    return Math.min(max, Math.max(min, snapped));
  }

  function commit(next: number) {
    const clean = clampToStep(next);
    if (clean !== value) onChange(clean);
  }

  /** Valor según dónde está el puntero respecto del centro del arco. */
  function valueFromPointer(event: React.PointerEvent<SVGSVGElement>): number {
    const svg = svgRef.current;
    if (!svg) return value;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 200;
    const y = ((event.clientY - rect.top) / rect.height) * 118;
    let angle = Math.atan2(CY - y, x - CX);
    // Debajo de la línea base: el extremo más cercano.
    if (angle < 0) angle = x < CX ? Math.PI : 0;
    return min + (1 - angle / Math.PI) * (max - min);
  }

  function handleKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
    const moves: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 2,
      PageDown: -step * 2,
    };
    if (event.key in moves) commit(value + moves[event.key]!);
    else if (event.key === "Home") commit(min);
    else if (event.key === "End") commit(max);
    else return;
    event.preventDefault();
  }

  return (
    <div className={cn("relative mx-auto w-full max-w-xs select-none", className)}>
      <svg
        ref={svgRef}
        viewBox="0 0 200 118"
        role="slider"
        tabIndex={0}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} ${unit}`}
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsDragging(true);
          commit(valueFromPointer(event));
        }}
        onPointerMove={(event) => {
          if (isDragging) commit(valueFromPointer(event));
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
        className={cn(
          "w-full touch-none overflow-visible rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          isDragging ? "cursor-grabbing" : "cursor-pointer",
        )}
      >
        {/* Riel y avance: el avance usa pathLength 100 para dibujarse en %. */}
        <path d={ARC} fill="none" strokeWidth={STROKE} strokeLinecap="round" className="stroke-input dark:stroke-muted" />
        <path
          d={ARC}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${fraction * 100} 100`}
          className={cn("stroke-primary", !isDragging && "transition-[stroke-dasharray] duration-300 ease-out motion-reduce:transition-none")}
        />

        {/* Marcas, una por paso; las de los extremos y el centro, más largas. */}
        {Array.from({ length: ticks + 1 }, (_, index) => {
          const t = index / ticks;
          const isMajor = index === 0 || index === ticks || index * 2 === ticks;
          const outer = pointAt(t, RADIUS + STROKE / 2 + (isMajor ? 9 : 6));
          const inner = pointAt(t, RADIUS + STROKE / 2 + 2);
          return (
            <line
              key={index}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              strokeWidth={isMajor ? 1.5 : 1}
              strokeLinecap="round"
              className={t <= fraction ? "stroke-foreground/60" : "stroke-muted-foreground/40"}
            />
          );
        })}

        {/* Perilla al final del avance: indica dónde arrastrar. */}
        <circle cx={knob.x} cy={knob.y} r={7} strokeWidth={2.5} className="fill-primary-foreground stroke-primary" />
      </svg>

      {/* Cifra dentro del arco. */}
      <div className="pointer-events-none absolute inset-x-0 top-[44%] text-center" aria-hidden>
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
          <span className="ml-0.5 text-lg font-medium text-muted-foreground">{unit}</span>
        </p>
        {caption && <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>}
      </div>

      <div className="mt-1 flex justify-between px-1 text-xs tabular-nums text-muted-foreground" aria-hidden>
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
}
