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
