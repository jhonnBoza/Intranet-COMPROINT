import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verificarSesion } from "@/lib/auth";
import type { Usuario, UsuarioPublico } from "@/types";

// ============================================================
//  Sesión — cookie httpOnly con un JWT firmado (no falsificable).
//  El token guarda solo el id; el usuario se lee de la base en
//  cada request (así una desactivación o cambio de rol aplica ya).
// ============================================================

export const COOKIE_SESION = "comproint_session";

/** Quita la contraseña antes de exponer el usuario al cliente. */
export function aPublico(u: Usuario): UsuarioPublico {
  const { password, ...pub } = u;
  return pub;
}

/** Lee el usuario actual desde la cookie firmada (server-side).
 *  Memorizado por request (React cache): si se llama varias veces en
 *  el mismo render (layout + página), solo consulta la base una vez. */
export const getUsuarioActual = cache(async (): Promise<UsuarioPublico | null> => {
  const token = cookies().get(COOKIE_SESION)?.value;
  if (!token) return null;
  const uid = await verificarSesion(token);
  if (!uid) return null;
  const u = await prisma.usuario.findUnique({ where: { id: uid } });
  if (!u || !u.activo) return null;
  return aPublico(u as unknown as Usuario);
});
