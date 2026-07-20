import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { listarPapelera } from "@/server/services/document.service";

// GET /api/trash  →  documentos en la papelera (solo Gerencia).
export async function GET() {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    return NextResponse.json({ documentos: await listarPapelera(user) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
