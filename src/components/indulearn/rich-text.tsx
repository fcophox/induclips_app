"use client";

import { useMemo } from "react";

import { sanitizeRichText } from "@/lib/indulearn/rich-text";
import { cn } from "@/lib/utils";

/**
 * Pinta la descripción o las notas con su formato (negrita, cursiva, listas,
 * enlaces). El HTML se limpia siempre antes de insertarlo: lo escribe un
 * administrador y lo leen todos los colaboradores.
 */
export function RichText({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizeRichText(html), [html]);
  // HTML saneado con DOMPurify y una lista cerrada de etiquetas.
  return <div className={cn("il-rich", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
