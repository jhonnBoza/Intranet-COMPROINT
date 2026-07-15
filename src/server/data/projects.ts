import type { Proyecto } from "@/types";

// ============================================================
//  Proyectos — expedientes transversales.
//  Un proyecto agrupa documentos de varias áreas (Calidad,
//  Producción, Logística, Administración, Proyectos).
// ============================================================

export const PROYECTOS: Proyecto[] = [
  {
    slug: "planta-sur",
    nombre: "Proyecto 1 · Planta Sur",
    descripcion: "Construcción de la nueva planta industrial Sur",
    estado: "en-curso",
  },
  {
    slug: "ampliacion-nave-3",
    nombre: "Proyecto 2 · Ampliación Nave 3",
    descripcion: "Ampliación estructural de la Nave 3",
    estado: "en-curso",
  },
];

export function getProyecto(slug: string): Proyecto | undefined {
  return PROYECTOS.find((p) => p.slug === slug);
}
