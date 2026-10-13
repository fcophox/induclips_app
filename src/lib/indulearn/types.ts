/**
 * Modelo de datos del prototipo InduLearn.
 *
 * Son los mismos conceptos que tendrá el MVP (marcas, cápsulas, usuarios,
 * progreso), pero viven en memoria y en localStorage. Cada tipo está pensado
 * para corresponder a una tabla cuando exista la base real.
 */

export type BrandStatus = "active" | "pending";

export type Brand = {
  id: string;
  name: string;
  /** Sigla de dos letras para la etiqueta visual. */
  short: string;
  /** Variable CSS de la serie (`--chart-N`): identifica la marca en chips y gráficos. */
  colorVar: string;
  status: BrandStatus;
  /** Marca ficticia, incluida sólo para ilustrar el crecimiento del sistema. */
  isDemo: boolean;
};

export const CATEGORIES = [
  "Seguridad",
  "Tecnología",
  "Portafolio",
  "Producto",
  "Técnicas de venta",
  "Atención al cliente",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type CapsuleStatus = "published" | "draft";

export type SubtitleCue = { at: number; text: string };

export type Capsule = {
  id: string;
  title: string;
  description: string;
  /** Marcas autorizadas: quien no tenga al menos una, no ve la cápsula. */
  brandIds: string[];
  category: Category;
  durationSec: number;
  status: CapsuleStatus;
  /** ISO. `null` mientras nunca se haya publicado. */
  publishedAt: string | null;
  /** Referencia al archivo o URL del video. En el prototipo es sólo un dato. */
  videoRef: string;
  /** Índice del estilo de miniatura generada (ver `THUMB_STYLES`). */
  thumb: number;
  subtitles: SubtitleCue[];
};

/**
 * `brand_admin` está reservado: la interfaz ya lo conoce para que añadir
 * administradores por marca no obligue a tocar cada pantalla.
 */
export type Role = "admin" | "brand_admin" | "collaborator";

export type UserStatus = "active" | "inactive";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  dealer: string;
  brandIds: string[];
  status: UserStatus;
  /** Días desde la última actividad simulada; alimenta "usuarios activos". */
  lastActiveDaysAgo: number;
};

export type Progress = {
  /** Punto más avanzado alcanzado, en segundos. */
  seconds: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Settings = {
  /** Porcentaje de visualización a partir del cual una cápsula cuenta como completada. */
  completionThreshold: number;
  autoplayMuted: boolean;
  subtitlesDefault: boolean;
  allowShare: boolean;
};

export type AppState = {
  version: number;
  brands: Brand[];
  capsules: Capsule[];
  users: User[];
  /** progress[userId][capsuleId] */
  progress: Record<string, Record<string, Progress>>;
  /** saved[userId] = ids de cápsulas guardadas */
  saved: Record<string, string[]>;
  settings: Settings;
  sessionUserId: string | null;
};

export type CapsuleState = "pending" | "in_progress" | "completed";
