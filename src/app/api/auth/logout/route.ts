import { NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/session";

// POST /api/auth/logout  →  cierra la sesión
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESION, "", { path: "/", maxAge: 0 });
  return res;
}
