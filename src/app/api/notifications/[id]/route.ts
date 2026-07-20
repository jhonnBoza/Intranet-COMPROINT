import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { eliminarNotificacion } from "@/server/services/notification.service";

type Ctx = { params: { id: string } };

// DELETE /api/notifications/[id]  →  borra una notificación del usuario.
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  await eliminarNotificacion(user, params.id);
  return NextResponse.json({ ok: true });
}
