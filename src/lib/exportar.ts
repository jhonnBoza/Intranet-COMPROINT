// Exportación a CSV (se abre en Excel). Sin dependencias.

/** Escapa un valor para CSV. */
function celda(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Genera y descarga un CSV. `columnas` define encabezados y cómo sacar cada
 * campo de una fila. Incluye BOM UTF-8 para que Excel muestre bien los acentos.
 */
export function descargarCSV<T>(
  nombreArchivo: string,
  filas: T[],
  columnas: { encabezado: string; valor: (fila: T) => unknown }[],
): void {
  const cabecera = columnas.map((c) => celda(c.encabezado)).join(";");
  const cuerpo = filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(";")).join("\n");
  const contenido = "﻿" + cabecera + "\n" + cuerpo; // BOM + datos
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo.endsWith(".csv") ? nombreArchivo : `${nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
