// Utilidades de formato para la UI.

export function formatoFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatoFechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "hace 2 días", "hace 3 h", etc. */
export function tiempoRelativo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} día${d > 1 ? "s" : ""}`;
  const m = Math.floor(d / 30);
  return `hace ${m} mes${m > 1 ? "es" : ""}`;
}
