import type { Metadata } from "next";

import { IndulearnProvider } from "@/components/indulearn/provider";

/**
 * InduLearn — prototipo navegable.
 *
 * Vive aislado del resto de la aplicación: no usa la sesión real ni la base
 * de datos. Todo lo que muestra son datos de ejemplo guardados en el
 * navegador (ver `src/lib/indulearn`).
 */
export const metadata: Metadata = {
  // `absolute` evita que la plantilla del layout raíz añada el nombre del starter.
  title: { absolute: "InduLearn", template: "%s · InduLearn" },
  description: "Cápsulas de conocimiento para la red comercial. Prototipo demostrativo.",
};

export default function IndulearnLayout({ children }: { children: React.ReactNode }) {
  return <IndulearnProvider>{children}</IndulearnProvider>;
}
