import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// ============================================================
//  Autenticación — hash de contraseñas y firma de sesión.
// ============================================================

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-insecure-secret-cambiar-en-produccion",
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
