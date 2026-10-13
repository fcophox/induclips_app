"use client";

import { useSyncExternalStore } from "react";

import { STATE_VERSION, createSeedState } from "./seed";
import type { AppState, Capsule, Progress, Settings, User } from "./types";

/**
 * Estado del prototipo: un único objeto en memoria, espejado en localStorage
 * para que una demostración sobreviva a una recarga.
 *
 * Es la costura que sustituirá el backend. Las pantallas sólo conocen los
 * hooks y las acciones de este archivo; cuando exista la base real, estas
 * acciones pasan a ser llamadas al servidor y el resto no cambia.
 *
 * Nada de esto es seguridad: los permisos por marca se simulan en el cliente.
 */

const STORAGE_KEY = "indulearn:state";

const seed = createSeedState();
let state: AppState = seed;
let hydrated = false;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sin almacenamiento (modo privado, cuota): la demo sigue en memoria.
  }
}

function update(recipe: (current: AppState) => AppState) {
  state = recipe(state);
  persist();
  emit();
}

/** Carga lo guardado en el navegador. Se llama una vez, tras montar. */
export function hydrate() {
  if (hydrated) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.version === STATE_VERSION) state = parsed;
    }
  } catch {
    // Estado ilegible: se arranca con los datos de ejemplo.
  }
  hydrated = true;
  emit();
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => seed,
  );
}

/**
 * `false` en el servidor y en el primer render del cliente. Las pantallas
 * muestran un esqueleto hasta entonces: la sesión simulada vive en
 * localStorage y pintar antes daría un parpadeo del perfil equivocado.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

export function useCurrentUser(): User | null {
  const { users, sessionUserId } = useAppState();
  return users.find((user) => user.id === sessionUserId) ?? null;
}

// ── Sesión ────────────────────────────────────────────────────────────────

export function login(userId: string) {
  update((s) => ({ ...s, sessionUserId: userId }));
}

export function logout() {
  update((s) => ({ ...s, sessionUserId: null }));
}

// ── Progreso ──────────────────────────────────────────────────────────────

function isComplete(seconds: number, capsule: Capsule, settings: Settings) {
  return (seconds / capsule.durationSec) * 100 >= settings.completionThreshold;
}

/**
 * Registra el avance de una reproducción. Guarda el punto más lejano
 * alcanzado y marca la cápsula como completada al cruzar el umbral
 * configurado. Una cápsula completada no vuelve a "en curso" al reverla.
 */
export function recordProgress(userId: string, capsuleId: string, seconds: number) {
  const capsule = state.capsules.find((c) => c.id === capsuleId);
  if (!capsule) return;

  const previous = state.progress[userId]?.[capsuleId];
  const furthest = Math.min(capsule.durationSec, Math.max(previous?.seconds ?? 0, seconds));
  const done = previous?.completedAt ?? (isComplete(furthest, capsule, state.settings) ? nowIso() : null);

  if (previous && previous.seconds === furthest && previous.completedAt === done) return;

  const next: Progress = {
    seconds: furthest,
    startedAt: previous?.startedAt ?? nowIso(),
    updatedAt: nowIso(),
    completedAt: done,
  };

  update((s) => ({
    ...s,
    progress: { ...s.progress, [userId]: { ...s.progress[userId], [capsuleId]: next } },
  }));
}

export function markCompleted(userId: string, capsuleId: string) {
  const capsule = state.capsules.find((c) => c.id === capsuleId);
  if (!capsule) return;
  const previous = state.progress[userId]?.[capsuleId];

  const next: Progress = {
    seconds: capsule.durationSec,
    startedAt: previous?.startedAt ?? nowIso(),
    updatedAt: nowIso(),
    completedAt: previous?.completedAt ?? nowIso(),
  };

  update((s) => ({
    ...s,
    progress: { ...s.progress, [userId]: { ...s.progress[userId], [capsuleId]: next } },
  }));
}

export function toggleSaved(userId: string, capsuleId: string) {
  update((s) => {
    const current = s.saved[userId] ?? [];
    const next = current.includes(capsuleId)
      ? current.filter((id) => id !== capsuleId)
      : [...current, capsuleId];
    return { ...s, saved: { ...s.saved, [userId]: next } };
  });
}

// ── Administración ────────────────────────────────────────────────────────

export function upsertCapsule(capsule: Capsule) {
  update((s) => {
    const exists = s.capsules.some((c) => c.id === capsule.id);
    return {
      ...s,
      capsules: exists
        ? s.capsules.map((c) => (c.id === capsule.id ? capsule : c))
        : [capsule, ...s.capsules],
    };
  });
}

export function setCapsulePublished(capsuleId: string, published: boolean) {
  update((s) => ({
    ...s,
    capsules: s.capsules.map((c) =>
      c.id === capsuleId
        ? {
            ...c,
            status: published ? "published" : "draft",
            publishedAt: published ? (c.publishedAt ?? nowIso()) : c.publishedAt,
          }
        : c,
    ),
  }));
}

export function deleteCapsule(capsuleId: string) {
  update((s) => ({ ...s, capsules: s.capsules.filter((c) => c.id !== capsuleId) }));
}

export function upsertUser(user: User) {
  update((s) => {
    const exists = s.users.some((u) => u.id === user.id);
    return {
      ...s,
      users: exists ? s.users.map((u) => (u.id === user.id ? user : u)) : [...s.users, user],
    };
  });
}

export function updateSettings(patch: Partial<Settings>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

/** Vuelve a los datos de ejemplo conservando la sesión abierta. */
export function resetDemo() {
  update((s) => ({ ...createSeedState(), sessionUserId: s.sessionUserId }));
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Avisos ────────────────────────────────────────────────────────────────

export type Toast = { id: number; message: string; tone: "success" | "info" | "error" };

let toasts: Toast[] = [];
let toastSeq = 0;
const toastListeners = new Set<() => void>();
const NO_TOASTS: Toast[] = [];

function emitToasts() {
  toastListeners.forEach((listener) => listener());
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitToasts();
}

export function toast(message: string, tone: Toast["tone"] = "success") {
  // El mismo aviso no se apila dos veces mientras sigue en pantalla.
  if (toasts.some((t) => t.message === message)) return;
  const id = ++toastSeq;
  toasts = [...toasts.slice(-2), { id, message, tone }];
  emitToasts();
  setTimeout(() => dismissToast(id), 3500);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (listener) => {
      toastListeners.add(listener);
      return () => {
        toastListeners.delete(listener);
      };
    },
    () => toasts,
    () => NO_TOASTS,
  );
}
