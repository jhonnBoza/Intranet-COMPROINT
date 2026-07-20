import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { urlSubidaDirecta } from "@/server/services/document.service";
import { validar, urlSubidaSchema } from "@/lib/validation";

// POST /api/documents/upload-url  →  URL firmada para subir el archivo directo
// a Supabase Storage (evita el límite de ~4.5 MB de las funciones de Vercel).
export async function POST(req: Request) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const v = validar(urlSubidaSchema, body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  try {
    const res = await urlSubidaDirecta(user, v.data.areaSlug);
    return NextResponse.json(res);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
