import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { restaurarDocumento, eliminarDefinitivo } from "@/server/services/document.service";
import { auditar } from "@/server/services/audit.service";

type Ctx = { params: { id: string } };

// POST /api/trash/[id]  →  restaura un documento de la papelera (solo Gerencia).
export async function POST(_req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    await restaurarDocumento(user, params.id);
    await auditar(user, { accion: "restauró", entidad: "documento", detalle: params.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

// DELETE /api/trash/[id]  →  borra DEFINITIVAMENTE (solo Gerencia).
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    const r = await eliminarDefinitivo(user, params.id);
    await auditar(user, { accion: "eliminó definitivamente", entidad: "documento", detalle: r.nombre });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
