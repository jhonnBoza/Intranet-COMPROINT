import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { puedeGestionarUsuarios } from "@/lib/permissions";
import { aPublico } from "@/lib/session";
import type { Usuario, UsuarioPublico, Rol } from "@/types";

// ============================================================
//  SERVICIO DE USUARIOS — autenticación y administración.
// ============================================================

const COLORES = ["#1a3c5c", "#0f766e", "#b45309", "#7c3aed", "#475569", "#0e7490", "#9f1239"];

/** Verifica credenciales; devuelve el usuario público o null. */
export async function autenticar(
  email: string,
  password: string,
): Promise<UsuarioPublico | null> {
  const u = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!u || !u.activo) return null;
  const ok = await verifyPassword(password, u.password);
  if (!ok) return null;
  return aPublico(u as unknown as Usuario);
}

/** Lista todos los usuarios (solo admin). */
export async function listarUsuarios(admin: UsuarioPublico): Promise<UsuarioPublico[]> {
  if (!puedeGestionarUsuarios(admin)) throw new Error("Sin permiso.");
  const rows = await prisma.usuario.findMany({ orderBy: { nombre: "asc" } });
  return rows.map((u) => aPublico(u as unknown as Usuario));
}

export interface NuevoUsuario {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  cargo: string;
  areaSlug: string | null;
}

export async function crearUsuario(admin: UsuarioPublico, data: NuevoUsuario): Promise<UsuarioPublico> {
  if (!puedeGestionarUsuarios(admin)) throw new Error("Sin permiso para gestionar usuarios.");
  if (!data.nombre?.trim() || !data.email?.trim() || !data.password) {
    throw new Error("Nombre, correo y contraseña son obligatorios.");
  }
  if (data.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");

  const email = data.email.toLowerCase().trim();
  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) throw new Error("Ya existe un usuario con ese correo.");

  const u = await prisma.usuario.create({
    data: {
      id: `u-${Date.now().toString(36)}`,
      nombre: data.nombre.trim(),
      email,
      password: await hashPassword(data.password),
      rol: data.rol,
      cargo: data.cargo?.trim() || data.rol,
      areaSlug: data.rol === "GERENTE_GENERAL" ? null : data.areaSlug,
      subareaSlug: null,
      avatarColor: COLORES[Math.floor(email.length) % COLORES.length],
      activo: true,
    },
  });
  return aPublico(u as unknown as Usuario);
}

export interface CambiosUsuario {
  nombre?: string;
  rol?: Rol;
  cargo?: string;
  areaSlug?: string | null;
  activo?: boolean;
  password?: string; // opcional: restablecer contraseña
}

export async function actualizarUsuario(
  admin: UsuarioPublico,
  id: string,
  cambios: CambiosUsuario,
): Promise<UsuarioPublico> {
  if (!puedeGestionarUsuarios(admin)) throw new Error("Sin permiso para gestionar usuarios.");
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) throw new Error("Usuario no encontrado.");

  // No permitir que el admin se desactive a sí mismo.
  if (id === admin.id && cambios.activo === false) {
    throw new Error("No puedes desactivar tu propia cuenta.");
  }

  const data: Record<string, unknown> = {};
  if (cambios.nombre !== undefined) data.nombre = cambios.nombre.trim();
  if (cambios.rol !== undefined) {
    data.rol = cambios.rol;
    if (cambios.rol === "GERENTE_GENERAL") data.areaSlug = null;
  }
  if (cambios.cargo !== undefined) data.cargo = cambios.cargo.trim();
  if (cambios.areaSlug !== undefined) data.areaSlug = cambios.areaSlug;
  if (cambios.activo !== undefined) data.activo = cambios.activo;
  if (cambios.password) {
    if (cambios.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
    data.password = await hashPassword(cambios.password);
  }

  const actualizado = await prisma.usuario.update({ where: { id }, data });
  return aPublico(actualizado as unknown as Usuario);
}
