import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// ============================================================
//  Autenticación — hash de contraseñas y firma de sesión.
// ============================================================

const secretRaw = process.env.SESSION_SECRET;

// En producción es OBLIGATORIO configurar SESSION_SECRET: sin él, cualquiera
// podría forjar una sesión firmando con un valor conocido. Fallamos rápido.
if (!secretRaw && process.env.NODE_ENV === "production") {
  throw new Error(
    "SESSION_SECRET no está configurada. Es obligatoria en producción (genera un valor aleatorio largo).",
  );
}

const secret = new TextEncoder().encode(
  secretRaw || "dev-insecure-secret-solo-para-desarrollo-local",
);

/** Hashea una contraseña (bcrypt). */
export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

/** Verifica una contraseña contra su hash. */
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/** Firma un token de sesión con el id del usuario (expira en 8h). */
export async function firmarSesion(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

/** Verifica el token y devuelve el id del usuario, o null si es inválido. */
export async function verificarSesion(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.uid as string) ?? null;
  } catch {
    return null;
  }
}
