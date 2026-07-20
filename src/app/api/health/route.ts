import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Verificación de salud + "keep-alive" de la base de datos.
// Un cron diario (ver vercel.json) golpea esta ruta para que Supabase (free)
// no pause el proyecto por inactividad tras 7 días.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, fecha: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
