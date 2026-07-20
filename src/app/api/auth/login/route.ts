import { NextResponse } from "next/server";
import { autenticar } from "@/server/services/user.service";
import { firmarSesion } from "@/lib/auth";
import { COOKIE_SESION } from "@/lib/session";
import { demasiadosFallos, registrarFallo, limpiarFallos } from "@/lib/ratelimit";

// POST /api/auth/login  →  valida credenciales (hash) y crea sesión firmada
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "Ingrese correo y contraseña." }, { status: 400 });
  }

  const clave = String(email).toLowerCase().trim();
  if (demasiadosFallos(clave)) {
    return NextResponse.json(
      { error: "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 },
    );
  }

  const user = await autenticar(email, password);
  if (!user) {
    registrarFallo(clave);
    return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 });
  }
  limpiarFallos(clave);

  // No auditamos inicios/cierres de sesión: es ruido de alto volumen. Lo que
  // importa (quién subió/editó/eliminó) sí queda registrado en esas acciones.
  const token = await firmarSesion(user.id);
  const res = NextResponse.json({ user });
  res.cookies.set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  });
  return res;
}
