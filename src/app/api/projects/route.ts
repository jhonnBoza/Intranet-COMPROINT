import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { crearProyecto } from "@/server/services/project.service";
import { auditar } from "@/server/services/audit.service";
import { validar, proyectoNuevoSchema } from "@/lib/validation";

// POST /api/projects  →  crea un proyecto nuevo
export async function POST(req: Request) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const validacion = validar(proyectoNuevoSchema, body);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }
  const { nombre, descripcion, estado } = validacion.data;

  try {
    const proyecto = await crearProyecto(user, {
      nombre,
      descripcion: descripcion ?? "",
      estado: estado ?? "en-curso",
    });
    await auditar(user, { accion: "creó", entidad: "proyecto", detalle: proyecto.nombre });
    return NextResponse.json({ proyecto }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear el proyecto.";
    const status = msg.includes("permiso") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
