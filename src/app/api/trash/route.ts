import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { listarPapelera, vaciarPapelera } from "@/server/services/document.service";
import { auditar } from "@/server/services/audit.service";

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

// DELETE /api/trash  →  vacía la papelera por completo (solo Gerencia).
export async function DELETE() {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    const n = await vaciarPapelera(user);
    if (n > 0) await auditar(user, { accion: "vació la papelera", entidad: "documento", detalle: `${n} documento(s)` });
    return NextResponse.json({ ok: true, eliminados: n });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
