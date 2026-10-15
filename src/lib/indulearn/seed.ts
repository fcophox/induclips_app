import type { AppState, Brand, Capsule, Comment, Progress, SubtitleCue, User } from "./types";

/** Subir este número descarta el estado guardado en el navegador. */
export const STATE_VERSION = 8;

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
    // Todas las cápsulas tienen video real, en public/indulearn/videos.
    // Contenido técnico común a todas las marcas.
    {
      id: "c-panel-instrumentos",
      title: "El panel de instrumentos y sus alertas",
      description:
        "Del botón de encendido a las alertas del tablero: qué indica cada testigo y cómo explicárselo al cliente en la entrega.",
      brandIds: ["kia", "hyundai", "landking", "sinotruk"],
      category: "Seguridad",
      durationSec: 8,
      status: "published",
      publishedAt: daysAgo(0, now),
      videoRef: "/indulearn/videos/panel-de-instrumentos.mp4",
      posterRef: "/indulearn/videos/panel-de-instrumentos.jpg",
      thumb: 0,
      subtitles: cues(8, [
        "Al encender, todos los testigos se iluminan un instante.",
        "El panel muestra el estado del vehículo en tiempo real.",
        "Una alerta roja pide detenerse; una amarilla, revisar pronto.",
      ]),
      notes: [
        "<p>La <strong>entrega del vehículo</strong> es el mejor momento para presentar el panel de instrumentos: el cliente está atento y todavía no se acostumbra a los testigos.</p>",
        "<p>Usa una regla simple de colores:</p>",
        "<ul>",
        "<li><p><strong>Rojo:</strong> detenerse en un lugar seguro (temperatura, presión de aceite, frenos).</p></li>",
        "<li><p><strong>Amarillo o naranjo:</strong> revisar pronto (motor, presión de neumáticos).</p></li>",
        "<li><p><strong>Verde o azul:</strong> sólo informa que un sistema está activo.</p></li>",
        "</ul>",
        "<p>Antes de terminar, muéstrale dónde ver el <em>nivel de aceite</em> y la <em>autonomía</em> en el menú de información del vehículo.</p>",
      ].join(""),
    },
    {
      id: "c-neumaticos",
      title: "Tipos de neumáticos",
      description:
        "Ruta, todo terreno y alto desempeño: en qué se diferencian y cómo recomendar el adecuado según el uso del cliente.",
      brandIds: ["kia", "hyundai", "landking", "sinotruk"],
      category: "Producto",
      durationSec: 8,
      status: "published",
      publishedAt: daysAgo(0, now),
      videoRef: "/indulearn/videos/tipos-de-neumaticos.mp4",
      posterRef: "/indulearn/videos/tipos-de-neumaticos.jpg",
      thumb: 4,
      subtitles: cues(8, [
        "El neumático de ruta prioriza confort y bajo ruido.",
        "El todo terreno agarra en ripio, barro y piedras.",
        "El de alto desempeño entrega precisión a mayor velocidad.",
      ]),
      notes: [
        "<p>La pregunta clave es <strong>dónde y cómo maneja el cliente</strong>:</p>",
        "<ul>",
        "<li><p><strong>Ciudad y carretera:</strong> neumático de ruta.</p></li>",
        "<li><p><strong>Faenas, campo o caminos de ripio:</strong> todo terreno.</p></li>",
        "<li><p><strong>Respuesta deportiva:</strong> alto desempeño.</p></li>",
        "</ul>",
        "<p>Recuerda que la presión correcta está en la etiqueta del marco de la puerta del conductor, y que un neumático con poca presión <em>gasta más combustible y frena peor</em>.</p>",
      ].join(""),
      resources: [
        {
          id: "r-neumaticos-wikipedia",
          kind: "link",
          title: "Neumático (Wikipedia)",
          url: "https://es.wikipedia.org/wiki/Neum%C3%A1tico",
        },
      ],
    },
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
      notes: [
        "<p>Este video es la puerta de entrada al módulo de motor. Antes de verlo, piensa en la última vez que un cliente te preguntó por el consumo o la potencia: casi siempre la respuesta empieza por entender cómo trabaja el motor.</p>",
        "<p>Fíjate en tres ideas:</p>",
        "<ol>",
        "<li><p><strong>La combustión:</strong> la mezcla de aire y combustible se comprime y se enciende, y esa explosión controlada empuja los pistones.</p></li>",
        "<li><p><strong>La temperatura de operación:</strong> el motor rinde mejor entre 90 °C y 105 °C, y por eso conviene no exigirlo en frío.</p></li>",
        "<li><p><strong>La eficiencia:</strong> un motor bien mantenido consume menos y dura más, un argumento que el cliente entiende de inmediato.</p></li>",
        "</ol>",
        "<p>En la ficha técnica tienes el ciclo de cuatro tiempos con frases cortas para explicárselo al cliente, y en la presentación, cinco láminas listas para la sala de ventas. Si quieres profundizar, revisa el artículo sobre el <a href=\"https://es.wikipedia.org/wiki/Ciclo_de_cuatro_tiempos\">ciclo de cuatro tiempos</a>.</p>",
        "<p><em>Para practicar:</em> explica el ciclo a un compañero en menos de un minuto, sin usar las palabras «admisión» ni «escape».</p>",
      ].join(""),
      resources: [
        {
          id: "r-motor-ficha",
          kind: "pdf",
          title: "Ficha técnica: el ciclo de cuatro tiempos",
          url: "/indulearn/recursos/ficha-tecnica-ciclo-cuatro-tiempos.pdf",
          size: "58 KB",
        },
        {
          id: "r-motor-presentacion",
          kind: "presentation",
          title: "El motor en 5 láminas",
          url: "/indulearn/recursos/el-motor-en-5-laminas.pptx",
          size: "34 KB",
        },
        {
          id: "r-motor-diagrama",
          kind: "image",
          title: "Diagrama del ciclo de cuatro tiempos",
          url: "/indulearn/recursos/diagrama-ciclo-cuatro-tiempos.svg",
          size: "7 KB",
        },
        {
          id: "r-motor-wikipedia",
          kind: "link",
          title: "Motor de combustión interna (Wikipedia)",
          url: "https://es.wikipedia.org/wiki/Motor_de_combusti%C3%B3n_interna",
        },
      ],
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
      notes: [
        "<p>En la prueba de manejo el cliente <strong>siente el freno antes de entenderlo</strong>. Aprovecha ese momento: pídele que frene suave y luego con decisión, y explícale qué hizo el auto en cada caso.</p>",
        "<p>Si el modelo tiene frenado autónomo de emergencia, cuéntale que el sistema puede frenar solo si detecta un obstáculo, pero que <em>nunca reemplaza la atención del conductor</em>.</p>",
      ].join(""),
      resources: [
        {
          id: "r-frenos-disco",
          kind: "link",
          title: "Freno de disco (Wikipedia)",
          url: "https://es.wikipedia.org/wiki/Freno_de_disco",
        },
      ],
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
  { id: "cm-1", capsuleId: "c-panel-instrumentos", userId: null, text: "Esta cápsula forma parte de la certificación de seguridad 2026. Complétala antes de fin de mes.", days: 10, likedBy: ["u-javier", "u-ignacio"] },
  { id: "cm-2", capsuleId: "c-panel-instrumentos", userId: "u-matias", text: "Muy claro lo de los colores de las alertas, se lo expliqué ayer a un cliente en la entrega.", days: 8, likedBy: ["u-carolina", "u-paula", "u-javier"] },
  { id: "cm-3", capsuleId: "c-panel-instrumentos", userId: "u-carolina", replyTo: "cm-2", text: "¡Bien, Matías! Recuerden mostrar también el testigo de presión de neumáticos.", days: 7, likedBy: ["u-matias"] },
  { id: "cm-4", capsuleId: "c-panel-instrumentos", userId: "u-paula", replyTo: "cm-2", text: "A mí me pasó lo mismo, el cliente quedó mucho más tranquilo.", days: 6 },
  { id: "cm-5", capsuleId: "c-panel-instrumentos", userId: "u-javier", text: "¿Habrá una cápsula sobre el asistente de mantención de carril?", days: 3, likedBy: ["u-ignacio"] },
  { id: "cm-6", capsuleId: "c-panel-instrumentos", userId: "u-carolina", replyTo: "cm-5", text: "Sí, Javier, está en producción. La publicamos la próxima semana.", days: 2 },
  { id: "cm-7", capsuleId: "c-motor-tecnico", userId: "u-ignacio", text: "Lo de la temperatura de operación me sirvió para explicar por qué no conviene exigir el motor en frío.", days: 2, likedBy: ["u-javier", "u-paula"] },
  { id: "cm-8", capsuleId: "c-motor-tecnico", userId: "u-carolina", replyTo: "cm-7", text: "Sumen el costo de mantención a 5 años: un motor cuidado gasta menos y suele cerrar la conversación.", days: 1, likedBy: ["u-ignacio"] },
  { id: "cm-9", capsuleId: "c-motor-tecnico", userId: null, text: "¿Qué pregunta sobre el motor escuchas más seguido? Cuéntanos y la incluimos en la próxima cápsula.", days: 1 },
  { id: "cm-10", capsuleId: "c-frenos", userId: "u-fernanda", text: "Me ayudó a explicar el frenado de emergencia sin enredarme.", days: 11, likedBy: ["u-camila"] },
  { id: "cm-11", capsuleId: "c-frenos", userId: null, text: "Actualizamos los subtítulos de esta cápsula.", days: 5 },
  { id: "cm-12", capsuleId: "c-frenos", userId: "u-camila", text: "Lo mostré en la prueba de manejo y los clientes lo notan.", days: 3, likedBy: ["u-fernanda"] },
  { id: "cm-13", capsuleId: "c-neumaticos", userId: "u-diego", text: "Buen resumen, lo compartí con el equipo de Antofagasta: allá casi todos preguntan por todo terreno.", days: 5, likedBy: ["u-valentina"] },
  { id: "cm-14", capsuleId: "c-neumaticos", userId: "u-carolina", replyTo: "cm-13", text: "Gracias, Diego. Pronto subimos la tabla de medidas por modelo.", days: 4 },
  { id: "cm-15", capsuleId: "c-motor-anatomia", userId: "u-valentina", text: "Ver las piezas una a una ayuda mucho para explicarle la mantención a clientes de flotas.", days: 7, likedBy: ["u-sebastian", "u-diego"] },
  { id: "cm-16", capsuleId: "c-motor-anatomia", userId: "u-sebastian", text: "¿Dónde encuentro la ficha técnica en PDF?", days: 2 },
  { id: "cm-17", capsuleId: "c-motor-anatomia", userId: "u-carolina", replyTo: "cm-16", text: "Está en el material complementario de «El motor explicado por un técnico».", days: 1, likedBy: ["u-sebastian"] },
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
        "c-panel-instrumentos": entry(8, 9, 8, true, now),
        "c-motor-tecnico": entry(3, 2, 1, false, now),
      },
      "u-diego": {
        "c-neumaticos": entry(8, 6, 5, true, now),
        "c-motor-anatomia": entry(4, 3, 2, false, now),
      },
      "u-fernanda": {
        "c-frenos": entry(8, 12, 11, true, now),
        "c-panel-instrumentos": entry(8, 4, 3, true, now),
      },
      "u-javier": {
        "c-panel-instrumentos": entry(8, 15, 14, true, now),
        "c-frenos": entry(3, 6, 5, false, now),
      },
      "u-valentina": {
        "c-motor-anatomia": entry(8, 8, 7, true, now),
      },
      "u-sebastian": {
        "c-motor-anatomia": entry(2, 4, 3, false, now),
      },
    },
    saved: { "u-matias": ["c-motor-tecnico"] },
    likes: {
      "c-panel-instrumentos": ["u-javier", "u-ignacio", "u-paula", "u-carolina"],
      "c-motor-tecnico": ["u-matias", "u-javier"],
      "c-frenos": ["u-fernanda", "u-camila", "u-javier"],
      "c-neumaticos": ["u-diego", "u-valentina", "u-fernanda"],
      "c-motor-anatomia": ["u-valentina", "u-sebastian", "u-diego", "u-tomas"],
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
