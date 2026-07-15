import { prisma } from "@/lib/db";
import { puedeCrearProyectos } from "@/lib/permissions";
import type { Proyecto, UsuarioPublico } from "@/types";

// ============================================================
//  SERVICIO DE PROYECTOS — capa de negocio (Prisma / Supabase).
// ============================================================

const asProy = (rows: unknown): Proyecto[] => rows as Proyecto[];

export async function listarProyectos(): Promise<Proyecto[]> {
  return asProy(await prisma.proyecto.findMany({ orderBy: { nombre: "asc" } }));
}

export async function obtenerProyecto(slug: string): Promise<Proyecto | null> {
  const p = await prisma.proyecto.findUnique({ where: { slug } });
  return (p as unknown as Proyecto) ?? null;
}

/** Convierte un nombre en slug único (sin acentos ni espacios). */
async function slugify(nombre: string): Promise<string> {
  const base =
    nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "proyecto";
  let slug = base;
  let i = 2;
  while (await prisma.proyecto.findUnique({ where: { slug } })) slug = `${base}-${i++}`;
  return slug;
}

export interface NuevoProyecto {
  nombre: string;
  descripcion: string;
  estado: Proyecto["estado"];
}

export async function crearProyecto(
  user: UsuarioPublico,
  data: NuevoProyecto,
): Promise<Proyecto> {
  if (!puedeCrearProyectos(user)) {
    throw new Error("No tiene permiso para crear proyectos.");
  }
  if (!data.nombre?.trim()) {
    throw new Error("El proyecto requiere un nombre.");
  }
  const proyecto = await prisma.proyecto.create({
    data: {
      slug: await slugify(data.nombre),
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || "Sin descripción",
      estado: data.estado === "cerrado" ? "cerrado" : "en-curso",
    },
  });
  return proyecto as unknown as Proyecto;
}
