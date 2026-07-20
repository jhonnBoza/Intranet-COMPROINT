import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getArea } from "@/server/data/areas";
import { puedePublicarAnuncios, esGlobal } from "@/lib/permissions";
import { notificarATodos, notificarUsuariosDeArea } from "@/server/services/notification.service";
import type { Anuncio, UsuarioPublico } from "@/types";

// ============================================================
//  SERVICIO DE ANUNCIOS — capa de negocio (Prisma / Supabase).
//  Gerencia publica para toda la empresa; un Jefe, solo para su área.
// ============================================================

const asAnuncios = (rows: unknown): Anuncio[] => rows as Anuncio[];

/**
 * Lista los anuncios visibles para el usuario (los de toda la empresa + los de
 * su propia área). La Gerencia ve todos.
 */
export async function listarAnuncios(user?: UsuarioPublico, limite = 15): Promise<Anuncio[]> {
  const where =
    !user || esGlobal(user)
      ? {}
      : { OR: [{ areaSlug: null }, { areaSlug: user.areaSlug ?? "__sin_area__" }] };
  return asAnuncios(
    await prisma.anuncio.findMany({ where, orderBy: { fecha: "desc" }, take: limite }),
  );
}

/** Elimina un anuncio (Gerencia cualquiera; un Jefe, solo los de su área). */
export async function eliminarAnuncio(user: UsuarioPublico, id: string): Promise<void> {
  const anuncio = await prisma.anuncio.findUnique({ where: { id } });
  if (!anuncio) throw new Error("Anuncio no encontrado.");
  const puede =
    esGlobal(user) ||
    (user.rol === "JEFE_AREA" && anuncio.areaSlug === user.areaSlug && anuncio.areaSlug !== null);
  if (!puede) throw new Error("Sin permiso para eliminar este anuncio.");
  await prisma.anuncio.delete({ where: { id } });
}

export interface NuevoAnuncio {
  titulo: string;
  cuerpo: string;
  prioridad: Anuncio["prioridad"];
}

/** Nombre del emisor: el área del usuario, o "Gerencia General" si es global. */
function emisor(user: UsuarioPublico): string {
  if (!user.areaSlug) return "Gerencia General";
  return getArea(user.areaSlug)?.nombre ?? user.cargo;
}

export async function crearAnuncio(
  user: UsuarioPublico,
  data: NuevoAnuncio,
): Promise<Anuncio> {
  if (!puedePublicarAnuncios(user)) {
    throw new Error("No tiene permiso para publicar anuncios corporativos.");
  }
  if (!data.titulo?.trim() || !data.cuerpo?.trim()) {
    throw new Error("El anuncio requiere título y contenido.");
  }
  // Gerencia → anuncio para toda la empresa (areaSlug null). Jefe → su área.
  const areaSlug = esGlobal(user) ? null : user.areaSlug ?? null;

  const anuncio = await prisma.anuncio.create({
    data: {
      id: `a-${randomUUID().slice(0, 12)}`,
      titulo: data.titulo.trim(),
      cuerpo: data.cuerpo.trim(),
      fecha: new Date().toISOString(),
      autor: emisor(user),
      prioridad: data.prioridad === "alta" ? "alta" : "normal",
      areaSlug,
    },
  });
  // Notifica según el alcance: toda la empresa, o solo el área (+ Gerencia).
  const titulo = `Nuevo anuncio: ${anuncio.titulo}`;
  if (areaSlug) {
    await notificarUsuariosDeArea(areaSlug, titulo, anuncio.cuerpo, "/dashboard", user.id);
  } else {
    await notificarATodos(titulo, anuncio.cuerpo, "/dashboard", user.id);
  }
  return anuncio as unknown as Anuncio;
}
