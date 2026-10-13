"use client";

import { useEffect } from "react";

import { hydrate } from "@/lib/indulearn/store";

import { Toaster } from "./ui";

/** Carga el estado guardado en el navegador y monta los avisos. */
export function IndulearnProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrate();
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
