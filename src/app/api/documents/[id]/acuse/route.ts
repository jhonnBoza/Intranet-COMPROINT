import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/session";
import { registrarAcuse, estadoAcuse } from "@/server/services/document.service";
import { auditar } from "@/server/services/audit.service";

type Ctx = { params: { id: string } };

// GET .../acuse   → estado del acuse (y reporte si eres editor)
export async function GET(_req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    const estado = await estadoAcuse(user, params.id);
    if (!estado) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
    return NextResponse.json(estado);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

// POST .../acuse  → confirma "leído y entendido"
export async function POST(_req: Request, { params }: Ctx) {
  const user = await getUsuarioActual();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    await registrarAcuse(user, params.id);
    await auditar(user, { accion: "confirmó lectura", entidad: "documento", detalle: params.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
