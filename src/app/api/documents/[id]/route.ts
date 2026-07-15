import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import {
  obtenerUrlDescarga,
  obtenerArchivoVista,
  actualizarDocumento,
  eliminarDocumento,
} from "@/server/services/document.service";
import { auditar } from "@/server/services/audit.service";
import { validar, documentoEdicionSchema } from "@/lib/validation";

type Ctx = { params: { id: string } };

// GET /api/documents/[id]        → descarga (redirige a URL firmada)
// GET /api/documents/[id]?ver=1  → vista previa embebida (mismo origen)
export async function GET(req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const ver = new URL(req.url).searchParams.get("ver") === "1";
  try {
    if (ver) {
      const archivo = await obtenerArchivoVista(user, params.id);
      if (!archivo) {
        return NextResponse.json({ error: "Este documento no tiene un archivo cargado." }, { status: 404 });
      }
      await auditar(user, { accion: "vio", entidad: "documento", detalle: archivo.nombre });
      return new NextResponse(archivo.buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": archivo.mime,
          "Content-Disposition": `inline; filename="${encodeURIComponent(archivo.nombre)}"`,
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    const dl = await obtenerUrlDescarga(user, params.id);
    if (!dl) {
      return NextResponse.json({ error: "Este documento no tiene un archivo para descargar." }, { status: 404 });
    }
    await auditar(user, { accion: "descargó", entidad: "documento", detalle: dl.nombre, areaSlug: dl.areaSlug });
    return NextResponse.redirect(dl.url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

// PATCH /api/documents/[id]  →  edita estado / confidencialidad
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const validacion = validar(documentoEdicionSchema, body);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }
  const { estado, confidencialidad } = validacion.data;

  try {
    const doc = await actualizarDocumento(user, params.id, { estado, confidencialidad });
    await auditar(user, { accion: "editó", entidad: "documento", detalle: doc.nombre, areaSlug: doc.areaSlug });
    return NextResponse.json({ documento: doc });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al editar.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

// DELETE /api/documents/[id]  →  elimina el documento
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const borrado = await eliminarDocumento(user, params.id);
    await auditar(user, { accion: "eliminó", entidad: "documento", detalle: borrado.nombre, areaSlug: borrado.areaSlug });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al eliminar.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
