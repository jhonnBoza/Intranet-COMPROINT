import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { crearDocumento, buscarGlobal } from "@/server/services/document.service";
import { auditar } from "@/server/services/audit.service";
import { validar, documentoNuevoSchema, excedeLimiteArchivo } from "@/lib/validation";
import type { TipoArchivo } from "@/types";

// GET /api/documents?q=...  →  búsqueda global
export async function GET(req: Request) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ resultados: await buscarGlobal(user, q) });
}

// Deriva el tipo de archivo desde la extensión del nombre.
function tipoDesdeNombre(nombre: string): TipoArchivo {
  const ext = nombre.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "pdf";
    case "doc":
    case "docx": return "docx";
    case "xls":
    case "xlsx": return "xlsx";
    case "ppt":
    case "pptx": return "pptx";
    case "zip":
    case "rar":
    case "7z": return "zip";
    case "dwg": return "dwg";
    case "png":
    case "jpg":
    case "jpeg": return "img";
    default: return "pdf";
  }
}

// POST /api/documents  →  registra un documento nuevo
export async function POST(req: Request) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const validacion = validar(documentoNuevoSchema, body);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }
  const { nombre, categoria, areaSlug, subareaSlug, confidencialidad, tamano } = validacion.data;

  const excede = excedeLimiteArchivo(validacion.data.contenidoBase64);
  if (excede) return NextResponse.json({ error: excede }, { status: 413 });

  try {
    const doc = await crearDocumento(user, {
      nombre,
      tipo: tipoDesdeNombre(nombre),
      categoria,
      areaSlug,
      subareaSlug: subareaSlug || null,
      confidencialidad,
      tamano: tamano ?? "—",
      proyectoSlug: validacion.data.proyectoSlug || null,
      contenidoBase64: validacion.data.contenidoBase64 ?? null,
      mime: validacion.data.mime ?? null,
      soloVista: !!validacion.data.soloVista,
    });
    await auditar(user, { accion: "subió", entidad: "documento", detalle: doc.nombre, areaSlug: doc.areaSlug });
    return NextResponse.json({ documento: doc }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear el documento.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
