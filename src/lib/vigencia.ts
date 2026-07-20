// ============================================================
//  Vigencia documental (control de revisión ISO 9001).
//  Fechas en formato YYYY-MM-DD (solo día, sin hora).
// ============================================================

export type EstadoVigencia = "vigente" | "por-vencer" | "vencido" | "sin-fecha";

/** Días de antelación con los que un documento pasa a "por vencer". */
export const DIAS_AVISO = 30;

/** Fecha de hoy en formato YYYY-MM-DD (UTC estable). */
export function hoyISO(base = new Date()): string {
  return base.toISOString().slice(0, 10);
}

/** Suma meses a una fecha YYYY-MM-DD y devuelve YYYY-MM-DD. */
export function sumarMeses(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + meses);
  return dt.toISOString().slice(0, 10);
}

/** Diferencia en días entre dos fechas YYYY-MM-DD (b - a). */
export function diasEntre(a: string, b: string): number {
  const da = Date.parse(a + "T00:00:00Z");
  const db = Date.parse(b + "T00:00:00Z");
  return Math.round((db - da) / 86_400_000);
}

export interface Vigencia {
  estado: EstadoVigencia;
  dias: number | null; // días que faltan (negativo = vencido)
}

/** Calcula el estado de vigencia a partir de la fecha de próxima revisión. */
export function calcularVigencia(
  fechaProximaRevision?: string | null,
  hoy = hoyISO(),
): Vigencia {
  if (!fechaProximaRevision) return { estado: "sin-fecha", dias: null };
  const dias = diasEntre(hoy, fechaProximaRevision);
  if (dias < 0) return { estado: "vencido", dias };
  if (dias <= DIAS_AVISO) return { estado: "por-vencer", dias };
  return { estado: "vigente", dias };
}

/** Opciones de periodicidad de revisión (en meses). */
export const PERIODOS_REVISION = [
  { v: 0, l: "Sin revisión periódica" },
  { v: 6, l: "Cada 6 meses" },
  { v: 12, l: "Anual (12 meses)" },
  { v: 24, l: "Cada 2 años" },
  { v: 36, l: "Cada 3 años" },
];

/** Etiqueta legible del estado. */
export const ETIQUETA_VIGENCIA: Record<EstadoVigencia, string> = {
  vigente: "Vigente",
  "por-vencer": "Por vencer",
  vencido: "Vencido",
  "sin-fecha": "Sin fecha de revisión",
};
