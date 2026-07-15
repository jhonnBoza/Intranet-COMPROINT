import { prisma } from "@/lib/db";
import { puedeGestionarUsuarios } from "@/lib/permissions";
import type { UsuarioPublico } from "@/types";

// ============================================================
//  BITÁCORA DE AUDITORÍA — trazabilidad (quién hizo qué y cuándo).
// ============================================================

export interface EventoAudit {
  accion: string;   // subió, descargó, vio, editó, eliminó, publicó, creó, inició sesión…
  entidad: string;  // documento, proyecto, carpeta, usuario, anuncio, sesión
  detalle: string;  // nombre/título del elemento
  areaSlug?: string | null;
}

/** Registra un evento. Nunca lanza: la auditoría no debe romper la operación. */
export async function auditar(user: UsuarioPublico, e: EventoAudit): Promise<void> {
  try {
    await prisma.auditoria.create({
      data: {
        fecha: new Date().toISOString(),
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        rol: user.rol,
        accion: e.accion,
        entidad: e.entidad,
        detalle: e.detalle,
        areaSlug: e.areaSlug ?? null,
      },
    });
  } catch (err) {
    // No rompe la operación, pero sí lo dejamos en logs para no perder trazas.
    console.error("[auditar] no se pudo registrar el evento:", err);
  }
}

const PAGE = 25;

export async function listarAuditoria(
  admin: UsuarioPublico,
  filtro: { page?: number; q?: string } = {},
) {
  if (!puedeGestionarUsuarios(admin)) throw new Error("Sin permiso.");
  const page = Math.max(1, filtro.page ?? 1);
  const q = filtro.q?.trim();
  const where = q
    ? {
        OR: [
          { usuarioNombre: { contains: q, mode: "insensitive" as const } },
          { detalle: { contains: q, mode: "insensitive" as const } },
          { accion: { contains: q, mode: "insensitive" as const } },
          { entidad: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [total, eventos] = await Promise.all([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({ where, orderBy: { fecha: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
  ]);
  return { eventos, total, page, totalPaginas: Math.max(1, Math.ceil(total / PAGE)) };
}
