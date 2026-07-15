import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { crearSubarea, eliminarSubarea } from "@/server/services/subarea.service";
import { auditar } from "@/server/services/audit.service";
import { validar, subareaNuevaSchema } from "@/lib/validation";

// POST /api/subareas  →  crea una carpeta (sub-área) en un área
export async function POST(req: Request) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const validacion = validar(subareaNuevaSchema, body);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }
  const { areaSlug, nombre } = validacion.data;

  try {
    const subarea = await crearSubarea(user, areaSlug, nombre);
    await auditar(user, { accion: "creó", entidad: "carpeta", detalle: subarea.nombre, areaSlug });
    return NextResponse.json({ subarea }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear la carpeta.";
    const status = msg.includes("permiso") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

// DELETE /api/subareas?areaSlug=x&slug=y  →  elimina una carpeta vacía
export async function DELETE(req: Request) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const areaSlug = url.searchParams.get("areaSlug");
  const slug = url.searchParams.get("slug");
  if (!areaSlug || !slug) {
    return NextResponse.json({ error: "Falta el área o la carpeta." }, { status: 400 });
  }

  try {
    await eliminarSubarea(user, areaSlug, slug);
    await auditar(user, { accion: "eliminó", entidad: "carpeta", detalle: slug, areaSlug });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al eliminar la carpeta.";
    const status = msg.includes("permiso") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
