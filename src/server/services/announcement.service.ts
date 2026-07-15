import { prisma } from "@/lib/db";
import { getArea } from "@/server/data/areas";
import { puedePublicarAnuncios } from "@/lib/permissions";
import { notificarATodos } from "@/server/services/notification.service";
import type { Anuncio, UsuarioPublico } from "@/types";

// ============================================================
//  SERVICIO DE ANUNCIOS — capa de negocio (Prisma / Supabase).
//  Publicar valida permiso (Gerencia / Jefes de Área).
// ============================================================

const asAnuncios = (rows: unknown): Anuncio[] => rows as Anuncio[];

export async function listarAnuncios(): Promise<Anuncio[]> {
  return asAnuncios(await prisma.anuncio.findMany({ orderBy: { fecha: "desc" } }));
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
  const anuncio = await prisma.anuncio.create({
    data: {
      id: `a-${Date.now().toString(36)}`,
      titulo: data.titulo.trim(),
      cuerpo: data.cuerpo.trim(),
      fecha: new Date().toISOString(),
      autor: emisor(user),
      prioridad: data.prioridad === "alta" ? "alta" : "normal",
    },
  });
  // Notifica a todos (menos al autor) sobre el nuevo anuncio.
  await notificarATodos(`Nuevo anuncio: ${anuncio.titulo}`, anuncio.cuerpo, "/dashboard", user.id);
  return anuncio as unknown as Anuncio;
}
