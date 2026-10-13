import type { AppState, Brand, Capsule, CapsuleState, Progress, User } from "./types";

/**
 * Lógica de lectura del prototipo: permisos por marca y cálculo de progreso.
 * Funciones puras sobre el estado, sin React, para poder moverlas tal cual
 * al servidor (o a políticas de base de datos) en el MVP.
 */

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

/** Marcas que el usuario puede ver. El administrador general ve todas. */
export function brandsForUser(state: AppState, user: User): Brand[] {
  if (isAdmin(user)) return state.brands;
  return state.brands.filter((brand) => user.brandIds.includes(brand.id));
}

/**
 * La regla de autorización del producto: un colaborador ve una cápsula sólo
 * si está publicada y comparte al menos una marca con ella.
 */
export function canViewCapsule(user: User, capsule: Capsule): boolean {
  if (capsule.status !== "published") return false;
  if (isAdmin(user)) return true;
  return capsule.brandIds.some((id) => user.brandIds.includes(id));
}

export function capsulesForUser(state: AppState, user: User): Capsule[] {
  return state.capsules
    .filter((capsule) => canViewCapsule(user, capsule))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export function progressOf(state: AppState, userId: string, capsuleId: string): Progress | null {
  return state.progress[userId]?.[capsuleId] ?? null;
}

export function capsuleState(progress: Progress | null): CapsuleState {
  if (!progress) return "pending";
  return progress.completedAt ? "completed" : "in_progress";
}

export function percentOf(progress: Progress | null, capsule: Capsule): number {
  if (!progress) return 0;
  if (progress.completedAt) return 100;
  return Math.min(99, Math.round((progress.seconds / capsule.durationSec) * 100));
}

export type LearningSummary = {
  available: number;
  completed: number;
  inProgress: number;
  pending: number;
  /** Porcentaje de cápsulas completadas sobre las disponibles. */
  percent: number;
};

export function learningSummary(state: AppState, user: User, capsules?: Capsule[]): LearningSummary {
  const list = capsules ?? capsulesForUser(state, user);
  let completed = 0;
  let inProgress = 0;

  for (const capsule of list) {
    const status = capsuleState(progressOf(state, user.id, capsule.id));
    if (status === "completed") completed += 1;
    else if (status === "in_progress") inProgress += 1;
  }

  const available = list.length;
  return {
    available,
    completed,
    inProgress,
    pending: available - completed,
    percent: available === 0 ? 0 : Math.round((completed / available) * 100),
  };
}

/** La cápsula en curso vista más recientemente, o la primera pendiente. */
export function capsuleToContinue(state: AppState, user: User): Capsule | null {
  const list = capsulesForUser(state, user);

  const inProgress = list
    .map((capsule) => ({ capsule, progress: progressOf(state, user.id, capsule.id) }))
    .filter(({ progress }) => capsuleState(progress) === "in_progress")
    .sort((a, b) => (b.progress?.updatedAt ?? "").localeCompare(a.progress?.updatedAt ?? ""));

  if (inProgress[0]) return inProgress[0].capsule;
  return list.find((capsule) => !progressOf(state, user.id, capsule.id)) ?? null;
}

export function isSaved(state: AppState, userId: string, capsuleId: string): boolean {
  return state.saved[userId]?.includes(capsuleId) ?? false;
}

export function brandById(state: AppState, id: string): Brand | undefined {
  return state.brands.find((brand) => brand.id === id);
}

export function collaborators(state: AppState): User[] {
  return state.users.filter((user) => user.role === "collaborator");
}
