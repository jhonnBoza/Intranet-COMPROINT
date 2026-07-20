import { prisma } from "@/lib/db";
import type { UsuarioPublico } from "@/types";

// ============================================================
//  SERVICIO DE NOTIFICACIONES (por usuario).
// ============================================================

/** Crea una notificación para todos los usuarios activos (excepto opcionalmente uno). */
export async function notificarATodos(
  titulo: string,
  cuerpo: string,
  url?: string,
  exceptoId?: string,
): Promise<void> {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { activo: true, ...(exceptoId ? { id: { not: exceptoId } } : {}) },
      select: { id: true },
    });
    if (usuarios.length === 0) return;
    const fecha = new Date().toISOString();
    await prisma.notificacion.createMany({
      data: usuarios.map((u) => ({ usuarioId: u.id, titulo, cuerpo, url: url ?? null, fecha })),
    });
  } catch { /* la notificación no debe romper la operación */ }
}

/**
 * Notifica a los aprobadores de un documento: la Gerencia General y, salvo que
 * el documento sea "restringido" (solo gerencia lo ve), el/los Jefe(s) del área.
 * Así no se filtra el nombre/código de un documento restringido a quien no
 * puede verlo. Se usa al subir un documento y al avisar vencimientos.
 */
export async function notificarAprobadores(
  areaSlug: string,
  titulo: string,
  cuerpo: string,
  opciones: { url?: string; exceptoId?: string; confidencialidad?: string } = {},
): Promise<void> {
  const { url, exceptoId, confidencialidad } = opciones;
  try {
    const soloGerencia = confidencialidad === "restringido";
    const usuarios = await prisma.usuario.findMany({
      where: {
        activo: true,
        ...(exceptoId ? { id: { not: exceptoId } } : {}),
        OR: soloGerencia
          ? [{ rol: "GERENTE_GENERAL" }]
          : [{ rol: "GERENTE_GENERAL" }, { rol: "JEFE_AREA", areaSlug }],
      },
      select: { id: true },
    });
    if (usuarios.length === 0) return;
    const fecha = new Date().toISOString();
    await prisma.notificacion.createMany({
      data: usuarios.map((u) => ({ usuarioId: u.id, titulo, cuerpo, url: url ?? null, fecha })),
    });
  } catch { /* la notificación no debe romper la operación */ }
}

export async function listarNotificaciones(user: UsuarioPublico) {
  const [items, noLeidas] = await Promise.all([
    prisma.notificacion.findMany({ where: { usuarioId: user.id }, orderBy: { fecha: "desc" }, take: 20 }),
    prisma.notificacion.count({ where: { usuarioId: user.id, leida: false } }),
  ]);
  return { items, noLeidas };
}

export async function marcarLeidas(user: UsuarioPublico): Promise<void> {
  await prisma.notificacion.updateMany({
    where: { usuarioId: user.id, leida: false },
    data: { leida: true },
  });
}

/** Borra todas las notificaciones del usuario (las suyas, no las de otros). */
export async function eliminarNotificaciones(user: UsuarioPublico): Promise<number> {
  const r = await prisma.notificacion.deleteMany({ where: { usuarioId: user.id } });
  return r.count;
}
