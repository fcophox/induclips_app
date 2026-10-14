"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, ThumbsUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNumber, formatRelative } from "@/lib/indulearn/format";
import { commentsOf, repliesOf, threadsOf } from "@/lib/indulearn/selectors";
import { addComment, toggleCommentLike, useAppState } from "@/lib/indulearn/store";
import type { Comment, User } from "@/lib/indulearn/types";
import { cn } from "@/lib/utils";

import { Avatar, Badge, Logo } from "./ui";

/**
 * Comentarios de una cápsula, con la forma de los de YouTube: hilos con
 * "me gusta", respuestas plegables y un campo que se despliega al escribir.
 *
 * `CommentsPanel` es la tarjeta que acompaña al video en escritorio; la hoja
 * modal de móvil usa `CommentList` y `CommentForm` por separado.
 */

export function CommentsPanel({
  capsuleId,
  user,
  onClose,
  className,
}: {
  capsuleId: string;
  user: User;
  onClose: () => void;
  className?: string;
}) {
  const state = useAppState();
  const listRef = useRef<HTMLDivElement>(null);
  const count = commentsOf(state, capsuleId).length;

  function handleSent() {
    // Los hilos nuevos aparecen arriba.
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section
      aria-label="Comentarios"
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-xl", className)}
    >
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
        <h2 className="flex items-baseline gap-2 text-lg font-bold text-foreground">
          Comentarios
          <span className="text-base font-normal tabular-nums text-muted-foreground">{formatNumber(count)}</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar comentarios"
          className="grid size-9 shrink-0 place-items-center rounded-full text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <CommentList capsuleId={capsuleId} user={user} />
      </div>
      <div className="border-t px-5 py-3">
        <CommentForm capsuleId={capsuleId} user={user} onSent={handleSent} />
      </div>
    </section>
  );
}

export function CommentList({ capsuleId, user }: { capsuleId: string; user: User }) {
  const state = useAppState();
  const threads = threadsOf(state, capsuleId);

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <MessageCircle className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Aún no hay comentarios. Sé el primero en comentar.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-6">
      {threads.map((comment) => (
        <CommentThread key={comment.id} comment={comment} user={user} />
      ))}
    </ul>
  );
}

function CommentThread({ comment, user }: { comment: Comment; user: User }) {
  const state = useAppState();
  const replies = repliesOf(state, comment.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  function handleReplySent() {
    setIsReplying(false);
    setIsExpanded(true);
  }

  return (
    <li className="relative">
      {/* Línea que une el comentario con sus respuestas. */}
      {replies.length > 0 && (
        <span aria-hidden className="absolute bottom-4 left-4 top-11 w-px -translate-x-1/2 bg-border" />
      )}

      <CommentItem comment={comment} user={user} onReply={() => setIsReplying(true)} />

      <div className="pl-12">
        {isReplying && (
          <CommentForm
            capsuleId={comment.capsuleId}
            user={user}
            parentId={comment.id}
            isAutoFocus
            onSent={handleReplySent}
            onCancel={() => setIsReplying(false)}
            className="mt-3"
          />
        )}

        {replies.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setIsExpanded((open) => !open)}
              aria-expanded={isExpanded}
              className="-ml-3 mt-2 flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {isExpanded ? (
                <ChevronUp className="size-4" aria-hidden />
              ) : (
                <ChevronDown className="size-4" aria-hidden />
              )}
              {replies.length} {replies.length === 1 ? "respuesta" : "respuestas"}
            </button>
            {isExpanded && (
              <ul className="mt-2 flex flex-col gap-4">
                {replies.map((reply) => (
                  <li key={reply.id}>
                    <CommentItem comment={reply} user={user} isReply onReply={() => setIsReplying(true)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function CommentItem({
  comment,
  user,
  isReply = false,
  onReply,
}: {
  comment: Comment;
  user: User;
  isReply?: boolean;
  onReply: () => void;
}) {
  const state = useAppState();
  const author = state.users.find((u) => u.id === comment.userId);
  const isPlatform = comment.userId === null;
  const name = isPlatform ? "Inducampus online" : (author?.name ?? "Usuario");
  const liked = comment.likedBy.includes(user.id);
  const likeCount = comment.likedBy.length;

  return (
    <div className="flex gap-3">
      <CommentAvatar name={name} isPlatform={isPlatform} isSmall={isReply} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[13px] font-semibold text-foreground">{name}</span>
          <AuthorBadge isPlatform={isPlatform} author={author} />
          <span className="text-xs text-muted-foreground">{formatRelative(comment.createdAt).toLowerCase()}</span>
        </div>
        <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">{comment.text}</p>
        <div className="-ml-2 mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggleCommentLike(user.id, comment.id)}
            aria-pressed={liked}
            aria-label={liked ? "Quitar me gusta del comentario" : "Me gusta el comentario"}
            className="grid size-8 place-items-center rounded-full text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ThumbsUp className={cn("size-4", liked && "fill-current")} aria-hidden />
          </button>
          {likeCount > 0 && (
            <span className="min-w-4 text-xs tabular-nums text-muted-foreground">{formatNumber(likeCount)}</span>
          )}
          <button
            type="button"
            onClick={onReply}
            className="ml-2 h-8 rounded-full px-3 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Responder
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentAvatar({ name, isPlatform, isSmall }: { name: string; isPlatform: boolean; isSmall?: boolean }) {
  const size = isSmall ? "size-6 text-[10px]" : "size-8 text-[11px]";
  if (isPlatform) {
    return (
      <Logo
        compact
        className={cn("shrink-0 self-start [&>span]:rounded-full", isSmall ? "[&>span]:size-6" : "[&>span]:size-8")}
      />
    );
  }
  return <Avatar name={name} className={size} />;
}

function AuthorBadge({ isPlatform, author }: { isPlatform: boolean; author: User | undefined }) {
  if (isPlatform)
    return (
      <Badge tone="info" className="px-1.5 py-0 text-[11px]">
        Plataforma
      </Badge>
    );
  if (author && author.role !== "collaborator") {
    return (
      <Badge tone="success" className="px-1.5 py-0 text-[11px]">
        Docente
      </Badge>
    );
  }
  return <Badge className="px-1.5 py-0 text-[11px]">Alumno</Badge>;
}

/**
 * Campo de comentario con subrayado, como en YouTube: los botones aparecen
 * sólo cuando se está escribiendo. Enter envía; Shift+Enter, salto de línea.
 */
export function CommentForm({
  capsuleId,
  user,
  parentId = null,
  isAutoFocus = false,
  onSent,
  onCancel,
  className,
}: {
  capsuleId: string;
  user: User;
  parentId?: string | null;
  isAutoFocus?: boolean;
  onSent?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [isActive, setIsActive] = useState(isAutoFocus);
  const canSend = text.trim().length > 0;
  const isReply = parentId !== null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    addComment(user.id, capsuleId, text, parentId);
    setText("");
    setIsActive(false);
    onSent?.();
  }

  function handleCancel() {
    setText("");
    setIsActive(false);
    onCancel?.();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    } else if (event.key === "Escape" && isReply) {
      event.stopPropagation();
      handleCancel();
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex w-full gap-3", className)}>
      <Avatar name={user.name} className={isReply ? "size-6 text-[10px]" : "size-8 text-[11px]"} />
      <div className="min-w-0 flex-1">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => setIsActive(true)}
          onKeyDown={handleKeyDown}
          placeholder={isReply ? "Agrega una respuesta…" : "Agrega un comentario…"}
          aria-label={isReply ? "Escribe una respuesta" : "Escribe un comentario"}
          autoFocus={isAutoFocus}
          rows={1}
          maxLength={500}
          className="field-sizing-content block max-h-32 min-h-8 w-full resize-none border-0 border-b border-border bg-transparent px-0 py-1.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
        />
        {isActive && (
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="rounded-full" disabled={!canSend}>
              {isReply ? "Responder" : "Comentar"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
