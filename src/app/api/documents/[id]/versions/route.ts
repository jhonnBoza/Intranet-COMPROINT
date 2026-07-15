import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import {
  listarVersiones,
  reemplazarArchivo,
  obtenerUrlVersion,
} from "@/server/services/document.service";
import { auditar } from "@/server/services/audit.service";
import { excedeLimiteArchivo } from "@/lib/validation";

type Ctx = { params: { id: string } };

// GET .../versions        → lista el historial
// GET .../versions?dl=ID  → descarga una versión anterior
export async function GET(req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const dl = new URL(req.url).searchParams.get("dl");
  try {
    if (dl) {
      const url = await obtenerUrlVersion(user, params.id, dl);
      if (!url) return NextResponse.json({ error: "Versión no encontrada." }, { status: 404 });
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ versiones: await listarVersiones(user, params.id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

// POST .../versions  →  sube una nueva versión (reemplaza el archivo)
export async function POST(req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.contenidoBase64) {
    return NextResponse.json({ error: "Falta el archivo de la nueva versión." }, { status: 400 });
  }
  const excede = excedeLimiteArchivo(body.contenidoBase64);
  if (excede) return NextResponse.json({ error: excede }, { status: 413 });
  try {
    const doc = await reemplazarArchivo(user, params.id, {
      contenidoBase64: body.contenidoBase64,
      mime: body.mime ?? null,
      tamano: body.tamano ?? "—",
    });
    await auditar(user, { accion: "nueva versión", entidad: "documento", detalle: `${doc.nombre} (v${doc.version})`, areaSlug: doc.areaSlug });
    return NextResponse.json({ documento: doc }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al subir la versión.";
    const status = msg.includes("permiso") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
