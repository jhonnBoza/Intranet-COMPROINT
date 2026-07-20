import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { eliminarAnuncio } from "@/server/services/announcement.service";
import { auditar } from "@/server/services/audit.service";

type Ctx = { params: { id: string } };

// DELETE /api/announcements/[id]  →  elimina un anuncio (solo Gerencia).
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    await eliminarAnuncio(user, params.id);
    await auditar(user, { accion: "eliminó", entidad: "anuncio", detalle: params.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
