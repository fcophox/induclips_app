import type { AppState, Brand, Capsule, Progress, SubtitleCue, User } from "./types";

/** Subir este número descarta el estado guardado en el navegador. */
export const STATE_VERSION = 1;

export const DEALERS = [
  "Sucursal Santiago Centro",
  "Sucursal Las Condes",
  "Sucursal Viña del Mar",
  "Sucursal Concepción",
  "Sucursal Antofagasta",
] as const;

/** Perfiles ofrecidos en el acceso demo. */
export const DEMO_PROFILE_IDS = ["u-matias", "u-diego", "u-carolina"] as const;

const BRANDS: Brand[] = [
  { id: "kia", name: "Kia", short: "KI", colorVar: "var(--chart-1)", status: "active", isDemo: false },
  { id: "hyundai", name: "Hyundai", short: "HY", colorVar: "var(--chart-2)", status: "active", isDemo: false },
  { id: "landking", name: "Landking", short: "LK", colorVar: "var(--chart-3)", status: "active", isDemo: false },
  { id: "sinotruk", name: "Sinotruk", short: "ST", colorVar: "var(--chart-4)", status: "active", isDemo: false },
  { id: "demo-a", name: "Marca Demo A", short: "DA", colorVar: "var(--chart-5)", status: "pending", isDemo: true },
  { id: "demo-b", name: "Marca Demo B", short: "DB", colorVar: "var(--chart-6)", status: "pending", isDemo: true },
];

function daysAgo(days: number, now: Date): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

/** Reparte las frases a lo largo de la duración para simular subtítulos. */
function cues(durationSec: number, lines: string[]): SubtitleCue[] {
  const step = durationSec / lines.length;
  return lines.map((text, i) => ({ at: Math.round(i * step), text }));
}

function buildCapsules(now: Date): Capsule[] {
  return [
    {
      id: "c-kia-seguridad",
      title: "Introducción a las tecnologías de seguridad",
      description:
        "Recorrido breve por los sistemas de seguridad activa y pasiva, y cómo explicarlos a un cliente en lenguaje simple.",
      brandIds: ["kia"],
      category: "Seguridad",
      durationSec: 95,
      status: "published",
      publishedAt: daysAgo(42, now),
      videoRef: "demo://kia/seguridad-intro.mp4",
      thumb: 0,
      subtitles: cues(95, [
        "La seguridad es uno de los primeros temas que pregunta un cliente.",
        "Distingue entre seguridad activa, que evita el accidente…",
        "…y seguridad pasiva, que protege cuando ya ocurrió.",
        "Explica cada sistema con una situación cotidiana.",
        "Cierra con el beneficio: tranquilidad para toda la familia.",
      ]),
    },
    {
      id: "c-hyundai-asistencia",
      title: "Características de sistemas de asistencia",
      description:
        "Qué hacen los asistentes de conducción, en qué situaciones ayudan y cómo demostrarlos durante una prueba de manejo.",
      brandIds: ["hyundai"],
      category: "Tecnología",
      durationSec: 110,
      status: "published",
      publishedAt: daysAgo(35, now),
      videoRef: "demo://hyundai/asistencia.mp4",
      thumb: 1,
      subtitles: cues(110, [
        "Los asistentes de conducción apoyan al conductor, no lo reemplazan.",
        "Presenta cada asistente con el problema que resuelve.",
        "En la prueba de manejo, anticipa lo que el cliente va a sentir.",
        "Evita tecnicismos: habla de comodidad y confianza.",
        "Recuerda verificar el equipamiento de cada versión.",
      ]),
    },
    {
      id: "c-landking-portafolio",
      title: "Conocimiento del portafolio comercial",
      description:
        "Panorama de la gama y de los perfiles de cliente a los que apunta cada línea, para orientar la primera conversación.",
      brandIds: ["landking"],
      category: "Portafolio",
      durationSec: 80,
      status: "published",
      publishedAt: daysAgo(28, now),
      videoRef: "demo://landking/portafolio.mp4",
      thumb: 2,
      subtitles: cues(80, [
        "Conocer la gama completa te permite recomendar con seguridad.",
        "Empieza por el uso: trabajo, familia o ambos.",
        "Relaciona cada línea con un perfil de cliente.",
        "Ten a mano las diferencias clave entre versiones.",
      ]),
    },
    {
      id: "c-sinotruk-atributos",
      title: "Principales atributos de vehículos comerciales",
      description:
        "Los atributos que más pesan en la decisión de un cliente de flota: capacidad, costo operativo y respaldo.",
      brandIds: ["sinotruk"],
      category: "Producto",
      durationSec: 125,
      status: "published",
      publishedAt: daysAgo(21, now),
      videoRef: "demo://sinotruk/atributos.mp4",
      thumb: 3,
      subtitles: cues(125, [
        "El cliente de flota compra una herramienta de trabajo.",
        "Habla de capacidad de carga según su operación real.",
        "El costo operativo importa tanto como el precio.",
        "Destaca el respaldo de servicio y repuestos.",
        "Pregunta siempre por rutas, cargas y frecuencia de uso.",
      ]),
    },
    {
      id: "c-kia-argumentos",
      title: "Argumentos de venta y diferenciadores",
      description:
        "Cómo construir un argumento de venta a partir de lo que el cliente valora, y responder las objeciones más frecuentes.",
      brandIds: ["kia"],
      category: "Técnicas de venta",
      durationSec: 100,
      status: "published",
      publishedAt: daysAgo(14, now),
      videoRef: "demo://kia/argumentos.mp4",
      thumb: 4,
      subtitles: cues(100, [
        "Un buen argumento parte de escuchar al cliente.",
        "Identifica qué valora: diseño, equipamiento, garantía.",
        "Convierte cada característica en un beneficio concreto.",
        "Ante una objeción, pregunta antes de responder.",
        "Resume los diferenciadores al cerrar la conversación.",
      ]),
    },
    {
      id: "c-hyundai-atencion",
      title: "Experiencia y atención al cliente",
      description:
        "Buenas prácticas para la recepción, el seguimiento y la entrega, pensadas para que el cliente quiera volver.",
      brandIds: ["hyundai"],
      category: "Atención al cliente",
      durationSec: 90,
      status: "published",
      publishedAt: daysAgo(7, now),
      videoRef: "demo://hyundai/atencion.mp4",
      thumb: 5,
      subtitles: cues(90, [
        "La experiencia empieza antes de hablar del vehículo.",
        "Recibe al cliente por su nombre y sin apuro.",
        "Haz seguimiento en el plazo que prometiste.",
        "La entrega es el momento que más se recuerda.",
      ]),
    },
  ];
}

const USERS: User[] = [
  {
    id: "u-carolina",
    name: "Carolina Fuentes",
    email: "carolina.fuentes@indulearn.demo",
    role: "admin",
    dealer: "Casa matriz",
    brandIds: ["kia", "hyundai", "landking", "sinotruk"],
    status: "active",
    lastActiveDaysAgo: 0,
  },
  {
    id: "u-matias",
    name: "Matías Rojas",
    email: "matias.rojas@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Santiago Centro",
    brandIds: ["kia"],
    status: "active",
    lastActiveDaysAgo: 0,
  },
  {
    id: "u-diego",
    name: "Diego Paredes",
    email: "diego.paredes@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Antofagasta",
    brandIds: ["landking", "sinotruk"],
    status: "active",
    lastActiveDaysAgo: 1,
  },
  {
    id: "u-fernanda",
    name: "Fernanda Soto",
    email: "fernanda.soto@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Las Condes",
    brandIds: ["hyundai"],
    status: "active",
    lastActiveDaysAgo: 2,
  },
  {
    id: "u-javier",
    name: "Javier Muñoz",
    email: "javier.munoz@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Viña del Mar",
    brandIds: ["kia", "hyundai"],
    status: "active",
    lastActiveDaysAgo: 4,
  },
  {
    id: "u-valentina",
    name: "Valentina Castro",
    email: "valentina.castro@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Concepción",
    brandIds: ["landking", "sinotruk"],
    status: "active",
    lastActiveDaysAgo: 6,
  },
  {
    id: "u-ignacio",
    name: "Ignacio Herrera",
    email: "ignacio.herrera@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Santiago Centro",
    brandIds: ["kia"],
    status: "active",
    lastActiveDaysAgo: 12,
  },
  {
    id: "u-camila",
    name: "Camila Vargas",
    email: "camila.vargas@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Las Condes",
    brandIds: ["hyundai"],
    status: "active",
    lastActiveDaysAgo: 20,
  },
  {
    id: "u-sebastian",
    name: "Sebastián Araya",
    email: "sebastian.araya@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Antofagasta",
    brandIds: ["sinotruk"],
    status: "active",
    lastActiveDaysAgo: 3,
  },
  {
    id: "u-paula",
    name: "Paula Espinoza",
    email: "paula.espinoza@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Viña del Mar",
    brandIds: ["kia", "landking"],
    status: "active",
    lastActiveDaysAgo: 45,
  },
  {
    id: "u-tomas",
    name: "Tomás Reyes",
    email: "tomas.reyes@indulearn.demo",
    role: "collaborator",
    dealer: "Sucursal Concepción",
    brandIds: ["hyundai", "landking", "sinotruk"],
    status: "inactive",
    lastActiveDaysAgo: 70,
  },
];

function entry(seconds: number, startedDays: number, updatedDays: number, done: boolean, now: Date): Progress {
  return {
    seconds,
    startedAt: daysAgo(startedDays, now),
    updatedAt: daysAgo(updatedDays, now),
    completedAt: done ? daysAgo(updatedDays, now) : null,
  };
}

export function createSeedState(now: Date = new Date()): AppState {
  return {
    version: STATE_VERSION,
    brands: BRANDS,
    capsules: buildCapsules(now),
    users: USERS,
    // Mezcla deliberada de vistas, en curso y pendientes para que las
    // pantallas de progreso tengan algo que mostrar desde el primer acceso.
    progress: {
      "u-matias": {
        "c-kia-seguridad": entry(95, 9, 8, true, now),
        "c-kia-argumentos": entry(38, 2, 1, false, now),
      },
      "u-diego": {
        "c-landking-portafolio": entry(80, 6, 5, true, now),
        "c-sinotruk-atributos": entry(52, 3, 2, false, now),
      },
      "u-fernanda": {
        "c-hyundai-asistencia": entry(110, 12, 11, true, now),
        "c-hyundai-atencion": entry(90, 4, 3, true, now),
      },
      "u-javier": {
        "c-kia-seguridad": entry(95, 15, 14, true, now),
        "c-hyundai-asistencia": entry(44, 6, 5, false, now),
      },
      "u-valentina": {
        "c-sinotruk-atributos": entry(125, 8, 7, true, now),
      },
      "u-sebastian": {
        "c-sinotruk-atributos": entry(30, 4, 3, false, now),
      },
    },
    saved: { "u-matias": ["c-kia-argumentos"] },
    settings: {
      completionThreshold: 90,
      autoplayMuted: true,
      subtitlesDefault: true,
      allowShare: true,
    },
    sessionUserId: null,
  };
}
