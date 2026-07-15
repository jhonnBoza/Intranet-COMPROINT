import { prisma } from "@/lib/db";
import { puedeGestionarArea } from "@/lib/permissions";
import type { SubArea, UsuarioPublico } from "@/types";

// ============================================================
//  SERVICIO DE SUB-ÁREAS (carpetas) — Prisma / Supabase.
//  Una "carpeta" es una sub-área dentro de un área.
// ============================================================

export async function subareasDeArea(areaSlug: string): Promise<SubArea[]> {
  const rows = await prisma.subArea.findMany({
    where: { areaSlug },
    orderBy: { nombre: "asc" },
  });
  return rows.map((r) => ({ slug: r.slug, nombre: r.nombre }));
}

/** Todas las sub-áreas agrupadas por área (para el sidebar). */
export async function subareasPorArea(): Promise<Record<string, SubArea[]>> {
  const rows = await prisma.subArea.findMany({ orderBy: { nombre: "asc" } });
  const map: Record<string, SubArea[]> = {};
  for (const r of rows) {
    (map[r.areaSlug] ??= []).push({ slug: r.slug, nombre: r.nombre });
  }
  return map;
}

function slugify(nombre: string): string {
  return (
    nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "carpeta"
  );
}

export async function crearSubarea(
  user: UsuarioPublico,
  areaSlug: string,
  nombre: string,
): Promise<SubArea> {
  if (!puedeGestionarArea(user, areaSlug)) {
    throw new Error("No tiene permiso para crear carpetas en esta área.");
  }
  if (!nombre?.trim()) {
    throw new Error("La carpeta requiere un nombre.");
  }
  const base = slugify(nombre);
  let slug = base;
  let i = 2;
  while (await prisma.subArea.findFirst({ where: { areaSlug, slug } })) {
    slug = `${base}-${i++}`;
  }
  const row = await prisma.subArea.create({
    data: { areaSlug, slug, nombre: nombre.trim() },
  });
  return { slug: row.slug, nombre: row.nombre };
}

/** Elimina una carpeta (sub-área). Solo si está vacía. */
export async function eliminarSubarea(
  user: UsuarioPublico,
  areaSlug: string,
  slug: string,
): Promise<void> {
  if (!puedeGestionarArea(user, areaSlug)) {
    throw new Error("No tiene permiso para eliminar carpetas en esta área.");
  }
  const enUso = await prisma.documento.count({ where: { areaSlug, subareaSlug: slug } });
  if (enUso > 0) {
    throw new Error(`La carpeta tiene ${enUso} documento${enUso > 1 ? "s" : ""}. Muévelos o elimínalos antes.`);
  }
  await prisma.subArea.deleteMany({ where: { areaSlug, slug } });
}
