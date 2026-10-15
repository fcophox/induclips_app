import { describe, it, expect } from "vitest";
import { isEmptyRichText, isRichText, plainToRichText, richTextToPlain, trimRichText } from "@/lib/indulearn/rich-text";

/**
 * Texto enriquecido de las cápsulas. El saneado (DOMPurify) necesita un DOM y
 * se prueba en el navegador; aquí van las conversiones puras, que deciden qué
 * se ve en las tarjetas y cuándo se recortan las notas.
 */
describe("richTextToPlain", () => {
  it("quita etiquetas y deja el texto legible", () => {
    expect(richTextToPlain("<p>Hola <strong>equipo</strong></p><p>Segundo <em>párrafo</em></p>")).toBe(
      "Hola equipo Segundo párrafo",
    );
  });

  it("marca los elementos de las listas", () => {
    expect(richTextToPlain("<ul><li><p>Uno</p></li><li><p>Dos</p></li></ul>")).toBe("• Uno • Dos");
  });

  it("decodifica las entidades comunes", () => {
    expect(richTextToPlain("<p>Aceite &amp; agua &lt;3&gt; &quot;ok&quot;&nbsp;listo</p>")).toBe(
      'Aceite & agua <3> "ok" listo',
    );
  });

  it("descarta el contenido de script y style", () => {
    expect(richTextToPlain('<p>Hola</p><script>alert("x")</script><style>p{}</style><p>chao</p>')).toBe("Hola chao");
  });

  it("deja tal cual el texto plano antiguo", () => {
    expect(richTextToPlain("  Texto sin formato  ")).toBe("Texto sin formato");
  });
});

describe("plainToRichText", () => {
  it("convierte párrafos separados por línea en blanco", () => {
    expect(plainToRichText("Primero\n\nSegundo\nmisma línea")).toBe("<p>Primero</p><p>Segundo<br>misma línea</p>");
  });

  it("escapa lo que parecería HTML", () => {
    expect(plainToRichText('<script>alert("x")</script>')).toBe("<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>");
  });
});

describe("isRichText / isEmptyRichText", () => {
  it("distingue HTML del editor de texto plano", () => {
    expect(isRichText("<p>Hola</p>")).toBe(true);
    expect(isRichText("Hola, 5 < 6")).toBe(false);
  });

  it("considera vacío el párrafo que deja el editor al borrar todo", () => {
    expect(isEmptyRichText("<p></p>")).toBe(true);
    expect(isEmptyRichText("")).toBe(true);
    expect(isEmptyRichText("<p>Hola</p>")).toBe(false);
  });
});

describe("trimRichText", () => {
  it("quita los párrafos vacíos de los extremos y conserva los del medio", () => {
    expect(trimRichText("<p></p><p>Uno</p><p></p><p>Dos</p><p><br></p><p>&nbsp;</p>")).toBe(
      "<p>Uno</p><p></p><p>Dos</p>",
    );
  });
});
