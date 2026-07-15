import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { listarUsuarios, crearUsuario } from "@/server/services/user.service";
import { auditar } from "@/server/services/audit.service";
import { validar, usuarioNuevoSchema } from "@/lib/validation";

// GET /api/users  →  lista de usuarios (solo admin)
export async function GET() {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    return NextResponse.json({ usuarios: await listarUsuarios(user) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

// POST /api/users  →  crea un usuario (solo admin)
export async function POST(req: Request) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const validacion = validar(usuarioNuevoSchema, body);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  try {
    const nuevo = await crearUsuario(user, {
      nombre: validacion.data.nombre,
      email: validacion.data.email,
      password: validacion.data.password,
      rol: validacion.data.rol,
      cargo: validacion.data.cargo ?? "",
      areaSlug: validacion.data.areaSlug ?? null,
    });
    await auditar(user, { accion: "creó", entidad: "usuario", detalle: nuevo.nombre });
    return NextResponse.json({ usuario: nuevo }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear el usuario.";
    const status = msg.includes("permiso") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
