import { NextResponse } from "next/server";
import { notificarVencimientos } from "@/server/services/document.service";
import { purgarNotificaciones } from "@/server/services/notification.service";

// Cron diario: avisa a los aprobadores los documentos por vencer / vencidos.
// Vercel invoca esta ruta según vercel.json. Si CRON_SECRET está configurado,
// exige el Authorization que Vercel envía automáticamente.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Fail-closed: sin CRON_SECRET configurado, la ruta no ejecuta nada (evita que
  // un anónimo dispare notificaciones y escrituras). Vercel Cron envía el
  // Authorization automáticamente cuando la variable está definida.
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return NextResponse.json({ error: "Cron no configurado (falta CRON_SECRET)." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const avisados = await notificarVencimientos();
    const purgadas = await purgarNotificaciones();
    return NextResponse.json({ ok: true, avisados, purgadas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
