/**
 * Identidad de la aplicación — el primer archivo que tocas al empezar.
 *
 * Vive aquí y no repartido por las pantallas porque renombrar un producto no
 * debería ser una cacería por el código: cambiar estos valores repinta el
 * título del navegador, el panel de acceso y los mensajes de error.
 *
 * Los COLORES no están aquí: son del sistema de diseño, en `tokens.yml`. Y la
 * marca de cada cliente —logo, favicon, color— tampoco: esa vive en la base,
 * en `tenants.branding`, y se aplica en runtime.
 */

export const APP_NAME = "Mi Aplicación";

/** Aparece bajo el nombre en el `<meta description>`. */
export const APP_DESCRIPTION = "Plataforma multi-tenant";

/**
 * El panel derecho de las pantallas de acceso. Sustitúyelo por lo que quieras
 * contar a quien está entrando — o borra el bloque entero de esas páginas si
 * prefieres un acceso a pantalla completa.
 */
export const APP_QUOTE = {
  text: "Cada equipo con su espacio, su marca y sus permisos. Sin que nadie vea lo que no le toca.",
  author: "El equipo",
  role: `Creadores de ${APP_NAME}`,
};

/** Quién da de alta las cuentas. Se muestra bajo el formulario de acceso. */
export const ACCOUNT_PROVISIONING_NOTE =
  "El alta de cuentas se gestiona por invitación.";
