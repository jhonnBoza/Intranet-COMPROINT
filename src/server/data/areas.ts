import type { Area } from "@/types";

// ============================================================
//  Organigrama de la empresa → Arquitectura de la información
//  Cada área y sub-área define la estructura de navegación
//  y, sobre todo, la estructura de permisos.
// ============================================================

export const AREAS: Area[] = [
  {
    slug: "gerencia",
    nombre: "Gerencia General",
    descripcion: "Políticas globales y reportes gerenciales",
    icono: "Crown",
    subareas: [
      { slug: "politicas", nombre: "Políticas Globales" },
      { slug: "reportes", nombre: "Reportes Gerenciales" },
    ],
  },
  {
    slug: "calidad",
    nombre: "Calidad",
    descripcion: "Aseguramiento y control de calidad",
    icono: "BadgeCheck",
    subareas: [
      { slug: "supervision", nombre: "Supervisión" },
      { slug: "qa-qc", nombre: "Registros QA/QC" },
    ],
  },
  {
    slug: "produccion",
    nombre: "Producción",
    descripcion: "Planos y registros de planta",
    icono: "Factory",
    subareas: [
      { slug: "supervision", nombre: "Supervisión" },
      { slug: "planos", nombre: "Planos" },
      { slug: "registros", nombre: "Registros (Capataz / Operarios / Soldadura)" },
    ],
  },
  {
    slug: "proyectos",
    nombre: "Proyectos",
    descripcion: "Expedientes técnicos y cronogramas",
    icono: "FolderKanban",
    subareas: [
      { slug: "expedientes", nombre: "Expedientes Técnicos" },
      { slug: "cronogramas", nombre: "Cronogramas" },
    ],
  },
  {
    slug: "logistica",
    nombre: "Logística",
    descripcion: "Almacén y mantenimiento",
    icono: "Truck",
    subareas: [
      { slug: "almacen", nombre: "Almacén" },
      { slug: "mantenimiento", nombre: "Mantenimiento" },
    ],
  },
  {
    slug: "administracion",
    nombre: "Administración",
    descripcion: "RRHH, contabilidad y facturación",
    icono: "Briefcase",
    subareas: [
      { slug: "rrhh", nombre: "Recursos Humanos" },
      { slug: "contabilidad", nombre: "Contabilidad" },
      { slug: "facturacion", nombre: "Facturación" },
    ],
  },
];

export function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}
