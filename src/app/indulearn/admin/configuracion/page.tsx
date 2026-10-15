"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { GaugeSlider } from "@/components/indulearn/gauge-slider";
import { Card, PageHeader, Switch } from "@/components/indulearn/ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resetDemo, toast, updateSettings, useAppState } from "@/lib/indulearn/store";

const ROADMAP = [
  { area: "Autenticación", now: "Selección de perfil demo", next: "Acceso corporativo con sesión real" },
  { area: "Datos", now: "Guardados en este navegador", next: "Base de datos PostgreSQL" },
  { area: "Permisos por marca", now: "Simulados en la interfaz", next: "Aplicados en el servidor" },
  { area: "Video", now: "Reproductor demostrativo", next: "Almacenamiento y streaming" },
  { area: "Indicadores", now: "Historial simulado", next: "Analítica persistente" },
];

export default function SettingsAdminPage() {
  const { settings } = useAppState();
  const [isResetting, setIsResetting] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configuración" description="Reglas de reproducción y datos de la demostración." />

      <Card className="overflow-hidden">
        <div className="border-b p-5">
          <h2 className="text-sm font-semibold text-foreground">Reglas de reproducción</h2>
        </div>

        {/* Mitad y mitad: el umbral con su tacómetro, y los interruptores. */}
        <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="flex flex-col gap-5 p-5">
            <div className="min-w-0">
              <p id="threshold-label" className="text-sm font-medium text-foreground">
                Umbral de finalización
              </p>
              <p id="threshold-hint" className="mt-0.5 text-sm text-muted-foreground">
                Porcentaje del video que hay que ver para que la cápsula cuente como completada.
              </p>
            </div>
            <GaugeSlider
              value={settings.completionThreshold}
              min={50}
              max={100}
              step={5}
              onChange={(next) => updateSettings({ completionThreshold: next })}
              labelledBy="threshold-label"
              describedBy="threshold-hint"
              caption="del video para completar"
              className="my-auto"
            />
          </div>

          <div className="divide-y">
            <div className="p-5">
              <Switch
                label="Reproducción automática sin audio"
                description="Al entrar al feed, la cápsula visible comienza sola y en silencio."
                checked={settings.autoplayMuted}
                onChange={(next) => updateSettings({ autoplayMuted: next })}
              />
            </div>
            <div className="p-5">
              <Switch
                label="Subtítulos activados por defecto"
                description="Recomendado: facilita seguir la cápsula sin sonido y mejora la accesibilidad."
                checked={settings.subtitlesDefault}
                onChange={(next) => updateSettings({ subtitlesDefault: next })}
              />
            </div>
            <div className="p-5">
              <Switch
                label="Permitir compartir enlaces"
                description="Muestra el botón para copiar el enlace de una cápsula. El enlace respeta los permisos por marca."
                checked={settings.allowShare}
                onChange={(next) => updateSettings({ allowShare: next })}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Datos de demostración</h2>
            <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
              Los cambios que hagas (cápsulas, usuarios, progreso) se guardan en este navegador. Puedes volver al
              estado inicial en cualquier momento.
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsResetting(true)}>
            <RotateCcw />
            Restablecer datos
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 pb-3 pt-5">
          <h2 className="text-sm font-semibold text-foreground">Alcance del prototipo</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Qué está simulado hoy y qué lo sustituye en el MVP. Este prototipo no es apto para producción.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-t text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-2.5 font-medium">Área</th>
                <th scope="col" className="px-5 py-2.5 font-medium">En el prototipo</th>
                <th scope="col" className="px-5 py-2.5 font-medium">En el MVP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ROADMAP.map((row) => (
                <tr key={row.area}>
                  <th scope="row" className="px-5 py-3 text-left font-medium text-foreground">{row.area}</th>
                  <td className="px-5 py-3 text-muted-foreground">{row.now}</td>
                  <td className="px-5 py-3 text-muted-foreground">{row.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={isResetting}
        variant="warning"
        title="Restablecer datos de demostración"
        description="Se descartarán las cápsulas, usuarios y progreso que hayas modificado, y volverán los datos de ejemplo."
        confirmText="Restablecer"
        onCancel={() => setIsResetting(false)}
        onConfirm={() => {
          resetDemo();
          toast("Datos de demostración restablecidos");
          setIsResetting(false);
        }}
      />
    </div>
  );
}
