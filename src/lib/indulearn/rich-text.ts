/**
 * Texto enriquecido de las cápsulas (descripción y notas del docente).
 *
 * Se guarda como HTML que produce el editor (Tiptap) y sólo admite lo que ese
 * editor ofrece: párrafos, negrita, cursiva, listas y enlaces. Los textos
 * anteriores, en texto plano con párrafos separados por una línea en blanco,
 * se siguen aceptando y se convierten al mostrarlos.
 */

import DOMPurify from "dompurify";

export const RICH_TEXT_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"] as const;

const LINK_PROTOCOL = /^(https?:|mailto:)/i;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** ¿Es HTML del editor o texto plano de antes? */
export function isRichText(value: string): boolean {
  return /<(p|ul|ol|li|strong|em|a|br)\b/i.test(value);
}

/** Texto plano (párrafos separados por línea en blanco) → HTML de párrafos. */
export function plainToRichText(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const EMPTY_PARAGRAPH = String.raw`<p>(?:\s|&nbsp;|<br[^>]*>)*</p>`;
const EDGE_EMPTY_PARAGRAPHS = new RegExp(`^(?:${EMPTY_PARAGRAPH})+|(?:${EMPTY_PARAGRAPH})+$`, "g");

/** Quita los párrafos vacíos del principio y del final (el editor suele dejar uno). */
export function trimRichText(html: string): string {
  return html.trim().replace(EDGE_EMPTY_PARAGRAPHS, "");
}

/**
 * Deja sólo las etiquetas permitidas y enlaces http(s) o mailto, que se abren
 * en otra pestaña. Necesita el DOM del navegador: en el servidor no se pinta
 * contenido enriquecido (las pantallas muestran un esqueleto hasta hidratar).
 */
export function sanitizeRichText(value: string): string {
  const html = isRichText(value) ? trimRichText(value) : plainToRichText(value);
  if (typeof window === "undefined") return escapeHtml(richTextToPlain(html));

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...RICH_TEXT_TAGS],
    ALLOWED_ATTR: ["href"],
  });
  // Enlaces: sólo protocolos seguros, siempre en otra pestaña y sin acceso a esta.
  const container = document.createElement("div");
  container.innerHTML = clean;
  container.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href") ?? "";
    if (!LINK_PROTOCOL.test(href)) {
      link.replaceWith(...Array.from(link.childNodes));
      return;
    }
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
  return container.innerHTML;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

/**
 * Versión en texto plano, para vistas que recortan a dos líneas (tarjetas,
 * superposición del video) y para medir el largo. No depende del DOM.
 */
export function richTextToPlain(value: string): string {
  if (!isRichText(value)) return value.trim();
  return value
    // Lo que no es texto visible no debe aparecer ni siquiera como texto.
    .replace(/<(script|style|iframe|object|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|li|ul|ol)>|<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** El editor deja `<p></p>` cuando se borra todo: eso cuenta como vacío. */
export function isEmptyRichText(value: string): boolean {
  return richTextToPlain(value).length === 0;
}
