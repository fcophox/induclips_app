import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-config";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "@/styles/globals.css";

import { ThemeScript } from "@/components/theme-script";
import { DEFAULT_THEME } from "@/lib/theme/mode";

// El nombre de la variable lo consume `fonts.sans` en tokens.yml.
// Roboto es variable: sin `weight` se carga el eje completo (100–900).
const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // El servidor pinta el tema por defecto; <ThemeScript> corrige la clase
  // antes del primer paint si el usuario eligió el otro.
  return (
    <html
      lang="es"
      className={`${roboto.variable} ${DEFAULT_THEME}`}
      style={{ colorScheme: DEFAULT_THEME }}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
