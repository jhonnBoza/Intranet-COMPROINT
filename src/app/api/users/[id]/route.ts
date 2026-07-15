import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { actualizarUsuario } from "@/server/services/user.service";
import { auditar } from "@/server/services/audit.service";
import { validar, usuarioEdicionSchema } from "@/lib/validation";

// PATCH /api/users/[id]  →  edita un usuario (rol, área, activo, contraseña)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const validacion = validar(usuarioEdicionSchema, body);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  try {
    const actualizado = await actualizarUsuario(user, params.id, {
      nombre: validacion.data.nombre,
      rol: validacion.data.rol,
      cargo: validacion.data.cargo,
      areaSlug: validacion.data.areaSlug,
      activo: validacion.data.activo,
      password: validacion.data.password,
    });
    await auditar(user, { accion: "editó", entidad: "usuario", detalle: actualizado.nombre });
    return NextResponse.json({ usuario: actualizado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al actualizar.";
    const status = msg.includes("permiso") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
