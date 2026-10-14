import type { AppState, Brand, Capsule, Comment, Progress, SubtitleCue, User } from "./types";

/** Subir este número descarta el estado guardado en el navegador. */
export const STATE_VERSION = 5;

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
    // Videos reales de ejemplo, en public/indulearn/videos. Contenido técnico
    // común a todas las marcas.
    {
      id: "c-motor-tecnico",
      title: "El motor explicado por un técnico",
      description:
        "Un técnico del taller resume cómo trabaja el motor: combustión, temperatura de operación y eficiencia.",
      brandIds: ["kia", "hyundai", "landking", "sinotruk"],
      category: "Tecnología",
      durationSec: 8,
      status: "published",
      publishedAt: daysAgo(0, now),
      videoRef: "/indulearn/videos/motor-explicado-por-tecnico.mp4",
      posterRef: "/indulearn/videos/motor-explicado-por-tecnico.jpg",
      thumb: 1,
      subtitles: cues(8, [
        "Todo empieza en la cámara de combustión.",
        "La temperatura de operación es clave.",
        "Un motor bien cuidado es más eficiente.",
      ]),
    },
    {
      id: "c-frenos",
      title: "Cómo funcionan los frenos",
      description:
        "Del pedal a la rueda: frenado normal, frenado de emergencia y cómo contárselo al cliente en la prueba de manejo.",
      brandIds: ["kia", "hyundai", "landking", "sinotruk"],
      category: "Seguridad",
      durationSec: 8,
      status: "published",
      publishedAt: daysAgo(0, now),
      videoRef: "/indulearn/videos/como-funcionan-los-frenos.mp4",
      posterRef: "/indulearn/videos/como-funcionan-los-frenos.jpg",
      thumb: 2,
      subtitles: cues(8, [
        "Al pisar el pedal, la presión llega a cada rueda.",
        "El frenado de emergencia detiene el auto a tiempo.",
        "Muéstralo en la prueba de manejo.",
      ]),
    },
    {
      id: "c-motor-anatomia",
      title: "Anatomía del motor",
      description:
        "Pistones, bielas y árbol de levas: las piezas del motor, una a una, hasta que queda montado en el vehículo.",
      brandIds: ["kia", "hyundai", "landking", "sinotruk"],
      category: "Producto",
      durationSec: 8,
      status: "published",
      publishedAt: daysAgo(0, now),
      videoRef: "/indulearn/videos/anatomia-del-motor.mp4",
      posterRef: "/indulearn/videos/anatomia-del-motor.jpg",
      thumb: 3,
      subtitles: cues(8, [
        "Los pistones transforman la combustión en movimiento.",
        "El árbol de levas coordina las válvulas.",
        "Así queda montado dentro del vehículo.",
      ]),
    },
  ];
}

const USERS: User[] = [
  {
    id: "u-carolina",
    name: "Carolina Fuentes",
    email: "carolina.fuentes@inducampus.demo",
    role: "admin",
    dealer: "Casa matriz",
    brandIds: ["kia", "hyundai", "landking", "sinotruk"],
    status: "active",
    lastActiveDaysAgo: 0,
  },
  {
    id: "u-matias",
    name: "Matías Rojas",
    email: "matias.rojas@inducampus.demo",
    role: "collaborator",
    dealer: "Sucursal Santiago Centro",
    brandIds: ["kia"],
    status: "active",
    lastActiveDaysAgo: 0,
  },
  {
    id: "u-diego",
    name: "Diego Paredes",
    email: "diego.paredes@inducampus.demo",
    role: "collaborator",
    dealer: "Sucursal Antofagasta",
    brandIds: ["landking", "sinotruk"],
    status: "active",
    lastActiveDaysAgo: 1,
  },
  {
    id: "u-fernanda",
    name: "Fernanda Soto",
    email: "fernanda.soto@inducampus.demo",
    role: "collaborator",
    dealer: "Sucursal Las Condes",
    brandIds: ["hyundai"],
    status: "active",
    lastActiveDaysAgo: 2,
  },
  {
    id: "u-javier",
    name: "Javier Muñoz",
    email: "javier.munoz@inducampus.demo",
    role: "collaborator",
    dealer: "Sucursal Viña del Mar",
    brandIds: ["kia", "hyundai"],
    status: "active",
    lastActiveDaysAgo: 4,
  },
  {
    id: "u-valentina",
    name: "Valentina Castro",
    email: "valentina.castro@inducampus.demo",
    role: "collaborator",
    dealer: "Sucursal Concepción",
    brandIds: ["landking", "sinotruk"],
    status: "active",
    lastActiveDaysAgo: 6,
  },
  {
    id: "u-ignacio",
    name: "Ignacio Herrera",
    email: "ignacio.herrera@inducampus.demo",
    role: "collaborator",
    dealer: "Sucursal Santiago Centro",
    brandIds: ["kia"],
    status: "active",
    lastActiveDaysAgo: 12,
  },
  {
    id: "u-camila",
    name: "Camila Vargas",
    email: "camila.vargas@inducampus.demo",
    role: "collaborator",
    dealer: "Sucursal Las Condes",
    brandIds: ["hyundai"],
    status: "active",
    lastActiveDaysAgo: 20,
  },
  {
    id: "u-sebastian",
    name: "Sebastián Araya",
    email: "sebastian.araya@inducampus.demo",
    role: "collaborator",
    dealer: "Sucursal Antofagasta",
    brandIds: ["sinotruk"],
    status: "active",
    lastActiveDaysAgo: 3,
  },
  {
    id: "u-paula",
    name: "Paula Espinoza",
    email: "paula.espinoza@inducampus.demo",
    role: "collaborator",
    dealer: "Sucursal Viña del Mar",
    brandIds: ["kia", "landking"],
    status: "active",
    lastActiveDaysAgo: 45,
  },
  {
    id: "u-tomas",
    name: "Tomás Reyes",
    email: "tomas.reyes@inducampus.demo",
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

type SeedComment = {
  id: string;
  capsuleId: string;
  userId: string | null;
  replyTo?: string;
  text: string;
  days: number;
  likedBy?: string[];
};

/** Comentarios de ejemplo: alumnos, docentes (admins) y avisos de la plataforma. */
const COMMENTS: SeedComment[] = [
  { id: "cm-1", capsuleId: "c-kia-seguridad", userId: null, text: "Esta cápsula forma parte de la certificación de seguridad 2026. Complétala antes de fin de mes.", days: 10, likedBy: ["u-javier", "u-ignacio"] },
  { id: "cm-2", capsuleId: "c-kia-seguridad", userId: "u-matias", text: "Muy claro lo del frenado autónomo, lo usé ayer con un cliente.", days: 8, likedBy: ["u-carolina", "u-paula", "u-javier"] },
  { id: "cm-3", capsuleId: "c-kia-seguridad", userId: "u-carolina", replyTo: "cm-2", text: "¡Bien, Matías! Recuerden mostrar también la alerta de punto ciego en la prueba de manejo.", days: 7, likedBy: ["u-matias"] },
  { id: "cm-4", capsuleId: "c-kia-seguridad", userId: "u-paula", replyTo: "cm-2", text: "A mí me pasó lo mismo, el cliente quedó convencido.", days: 6 },
  { id: "cm-5", capsuleId: "c-kia-seguridad", userId: "u-javier", text: "¿Habrá una cápsula sobre el asistente de mantención de carril?", days: 3, likedBy: ["u-ignacio"] },
  { id: "cm-6", capsuleId: "c-kia-seguridad", userId: "u-carolina", replyTo: "cm-5", text: "Sí, Javier, está en producción. La publicamos la próxima semana.", days: 2 },
  { id: "cm-7", capsuleId: "c-kia-argumentos", userId: "u-ignacio", text: "El argumento de garantía es el que más me funciona en sala.", days: 2, likedBy: ["u-javier", "u-paula"] },
  { id: "cm-8", capsuleId: "c-kia-argumentos", userId: "u-carolina", replyTo: "cm-7", text: "Sumen el costo de mantención a 5 años: suele cerrar la conversación.", days: 1, likedBy: ["u-ignacio"] },
  { id: "cm-9", capsuleId: "c-kia-argumentos", userId: null, text: "¿Qué objeción escuchas más seguido? Cuéntanos y la incluimos en la próxima cápsula.", days: 1 },
  { id: "cm-10", capsuleId: "c-hyundai-asistencia", userId: "u-fernanda", text: "Me ayudó a explicar el control crucero adaptativo sin enredarme.", days: 11, likedBy: ["u-camila"] },
  { id: "cm-11", capsuleId: "c-hyundai-asistencia", userId: null, text: "Actualizamos los subtítulos de esta cápsula.", days: 5 },
  { id: "cm-12", capsuleId: "c-hyundai-atencion", userId: "u-camila", text: "Practiqué el saludo inicial y los clientes lo notan.", days: 3, likedBy: ["u-fernanda"] },
  { id: "cm-13", capsuleId: "c-landking-portafolio", userId: "u-diego", text: "Buen resumen del portafolio, lo compartí con el equipo de Antofagasta.", days: 5, likedBy: ["u-valentina"] },
  { id: "cm-14", capsuleId: "c-landking-portafolio", userId: "u-carolina", replyTo: "cm-13", text: "Gracias, Diego. Pronto subimos la ficha comparativa por modelo.", days: 4 },
  { id: "cm-15", capsuleId: "c-sinotruk-atributos", userId: "u-valentina", text: "El dato de consumo por tonelada es clave para flotas.", days: 7, likedBy: ["u-sebastian", "u-diego"] },
  { id: "cm-16", capsuleId: "c-sinotruk-atributos", userId: "u-sebastian", text: "¿Dónde encuentro la ficha técnica en PDF?", days: 2 },
  { id: "cm-17", capsuleId: "c-sinotruk-atributos", userId: "u-carolina", replyTo: "cm-16", text: "Está en la intranet comercial, sección Sinotruk › Fichas.", days: 1, likedBy: ["u-sebastian"] },
];

function buildComments(now: Date): Comment[] {
  return COMMENTS.map(({ replyTo, days, likedBy, ...comment }) => ({
    ...comment,
    parentId: replyTo ?? null,
    createdAt: daysAgo(days, now),
    likedBy: likedBy ?? [],
  }));
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
    likes: {
      "c-kia-seguridad": ["u-javier", "u-ignacio", "u-paula", "u-carolina"],
      "c-kia-argumentos": ["u-matias", "u-javier"],
      "c-hyundai-asistencia": ["u-fernanda", "u-camila", "u-javier"],
      "c-hyundai-atencion": ["u-fernanda"],
      "c-landking-portafolio": ["u-diego", "u-valentina"],
      "c-sinotruk-atributos": ["u-valentina", "u-sebastian", "u-diego", "u-tomas"],
    },
    comments: buildComments(now),
    settings: {
      completionThreshold: 90,
      autoplayMuted: true,
      subtitlesDefault: true,
      allowShare: true,
    },
    sessionUserId: null,
  };
}
