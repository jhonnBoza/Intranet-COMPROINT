import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { listarNotificaciones, marcarLeidas, eliminarNotificaciones } from "@/server/services/notification.service";

// GET /api/notifications  →  notificaciones del usuario + no leídas
export async function GET() {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json(await listarNotificaciones(user));
}

// PATCH /api/notifications  →  marca todas como leídas
export async function PATCH() {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  await marcarLeidas(user);
  return NextResponse.json({ ok: true });
}

// DELETE /api/notifications  →  borra todas las notificaciones del usuario
export async function DELETE() {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const eliminadas = await eliminarNotificaciones(user);
  return NextResponse.json({ ok: true, eliminadas });
}
