import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { crearAnuncio } from "@/server/services/announcement.service";
import { auditar } from "@/server/services/audit.service";
import { validar, anuncioNuevoSchema } from "@/lib/validation";

// POST /api/announcements  →  publica un anuncio corporativo
export async function POST(req: Request) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const validacion = validar(anuncioNuevoSchema, body);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }
  const { titulo, cuerpo, prioridad } = validacion.data;

  try {
    const anuncio = await crearAnuncio(user, {
      titulo,
      cuerpo,
      prioridad: prioridad === "alta" ? "alta" : "normal",
    });
    await auditar(user, { accion: "publicó", entidad: "anuncio", detalle: anuncio.titulo });
    return NextResponse.json({ anuncio }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al publicar el anuncio.";
    const status = msg.includes("permiso") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
