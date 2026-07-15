// ============================================================
//  Límite de intentos de login (en memoria).
//  Nota: por servidor. Para múltiples instancias se usaría Redis.
// ============================================================

const fallos = new Map<string, number[]>();
const VENTANA_MS = 5 * 60 * 1000; // 5 minutos
const MAX_FALLOS = 8;

/** ¿Superó el máximo de intentos fallidos en la ventana? */
export function demasiadosFallos(clave: string): boolean {
  const ahora = Date.now();
  const arr = (fallos.get(clave) ?? []).filter((t) => ahora - t < VENTANA_MS);
  fallos.set(clave, arr);
  return arr.length >= MAX_FALLOS;
}

export function registrarFallo(clave: string): void {
  const arr = fallos.get(clave) ?? [];
  arr.push(Date.now());
  fallos.set(clave, arr);
}

export function limpiarFallos(clave: string): void {
  fallos.delete(clave);
}
