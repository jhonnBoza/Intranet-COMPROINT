import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { listarAuditoria } from "@/server/services/audit.service";

// GET /api/audit?page=1&q=...  →  bitácora (solo admin)
export async function GET(req: Request) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
  const q = url.searchParams.get("q") ?? "";
  try {
    return NextResponse.json(await listarAuditoria(user, { page, q }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
