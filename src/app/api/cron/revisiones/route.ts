import { NextResponse } from "next/server";
import { notificarVencimientos } from "@/server/services/document.service";

// Cron diario: avisa a los aprobadores los documentos por vencer / vencidos.
// Vercel invoca esta ruta según vercel.json. Si CRON_SECRET está configurado,
// exige el Authorization que Vercel envía automáticamente.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secreto}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }
  try {
    const avisados = await notificarVencimientos();
    return NextResponse.json({ ok: true, avisados });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
