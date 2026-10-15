"use client";

import { useId, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Italic, Link2, List, ListOrdered, Redo2, Undo2, Unlink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isRichText, plainToRichText, trimRichText } from "@/lib/indulearn/rich-text";
import { cn } from "@/lib/utils";

function isSafeLink(value: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(value);
}

/**
 * Campo de texto enriquecido (Tiptap) con barra de formato: negrita, cursiva,
 * listas con viñetas y numeradas, y enlaces. Entrega HTML; el vacío es "".
 * Sólo se habilita lo que la vista del colaborador sabe pintar.
 */
export function RichTextEditor({
  label,
  hint,
  value,
  onChange,
  placeholder,
  minHeightClass = "min-h-28",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
}) {
  const labelId = useId();
  const hintId = useId();

  const editor = useEditor({
    // Next renderiza en el servidor: el editor se monta recién en el navegador.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        // Sin párrafo vacío forzado al final: en la vista sumaría un espacio de más.
        trailingNode: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    // Los textos de antes son texto plano: se pasan a párrafos al abrirlos.
    content: value ? (isRichText(value) ? trimRichText(value) : plainToRichText(value)) : "",
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        ...(hint ? { "aria-describedby": hintId } : {}),
        class: cn("il-rich px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none", minHeightClass),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium text-foreground">
        {label}
      </span>
      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius)] border bg-background shadow-xs transition-[color,box-shadow]",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          // Texto de ayuda dentro del editor vacío (extensión Placeholder).
          "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
        )}
      >
        {editor ? <Toolbar editor={editor} label={label} /> : <div className="h-10 border-b bg-muted/40" />}
        <EditorContent editor={editor} />
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function Toolbar({ editor, label }: { editor: Editor; label: string }) {
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkInputId = useId();

  // La barra se vuelve a pintar sólo cuando cambia algo que muestra.
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      link: current.isActive("link"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  function openLink() {
    setLinkValue((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkError(null);
    setIsLinkOpen(true);
  }

  function applyLink() {
    const href = linkValue.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setIsLinkOpen(false);
      return;
    }
    const withProtocol = /^[a-z]+:/i.test(href) ? href : `https://${href}`;
    if (!isSafeLink(withProtocol)) {
      setLinkError("Usa una dirección web (https://…) o un correo (mailto:…).");
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    // Sin texto seleccionado, la propia dirección se inserta como texto del enlace.
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain
        .insertContent({ type: "text", text: withProtocol, marks: [{ type: "link", attrs: { href: withProtocol } }] })
        .run();
    } else {
      chain.setLink({ href: withProtocol }).run();
    }
    setIsLinkOpen(false);
  }

  return (
    <div className="border-b bg-muted/40">
      <div role="toolbar" aria-label={`Formato de ${label.toLowerCase()}`} className="flex flex-wrap items-center gap-0.5 p-1">
        <ToolButton
          icon={Bold}
          label="Negrita"
          shortcut="⌘B"
          isActive={active.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolButton
          icon={Italic}
          label="Cursiva"
          shortcut="⌘I"
          isActive={active.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <Divider />
        <ToolButton
          icon={List}
          label="Lista con viñetas"
          isActive={active.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolButton
          icon={ListOrdered}
          label="Lista numerada"
          isActive={active.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <Divider />
        <ToolButton
          icon={Link2}
          label={active.link ? "Editar enlace" : "Agregar enlace"}
          isActive={active.link || isLinkOpen}
          onClick={openLink}
        />
        {active.link && (
          <ToolButton
            icon={Unlink}
            label="Quitar enlace"
            onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
          />
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <ToolButton
            icon={Undo2}
            label="Deshacer"
            shortcut="⌘Z"
            isDisabled={!active.canUndo}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <ToolButton
            icon={Redo2}
            label="Rehacer"
            shortcut="⇧⌘Z"
            isDisabled={!active.canRedo}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </div>
      </div>

      {isLinkOpen && (
        <div className="flex flex-col gap-1.5 border-t bg-background px-2 py-2">
          <div className="flex items-center gap-2">
            <label htmlFor={linkInputId} className="sr-only">
              Dirección del enlace
            </label>
            <Input
              id={linkInputId}
              type="url"
              inputMode="url"
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              onKeyDown={(event) => {
                // Enter aplica el enlace sin enviar el formulario; Escape cancela.
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setIsLinkOpen(false);
                  editor.commands.focus();
                }
              }}
              placeholder="https://…"
              aria-invalid={Boolean(linkError)}
              className="h-8"
              autoFocus
            />
            <Button type="button" size="sm" onClick={applyLink}>
              Aplicar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsLinkOpen(false);
                editor.commands.focus();
              }}
            >
              Cancelar
            </Button>
          </div>
          {linkError && (
            <p role="alert" className="text-xs text-destructive">
              {linkError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  isActive = false,
  isDisabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      // El foco se queda en el texto: así el formato se aplica a la selección.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      aria-pressed={isActive}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        "grid size-8 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
        isActive && "bg-accent text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}
