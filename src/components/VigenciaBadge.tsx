import { calcularVigencia } from "@/lib/vigencia";

/**
 * Semáforo de vigencia documental (ISO): vigente / por vencer / vencido.
 * Mismo formato que StatusBadge (ring + fondos -50) para leer como un sistema.
 */
export function VigenciaBadge({
  fechaProximaRevision,
}: {
  fechaProximaRevision?: string | null;
}) {
  const { estado, dias } = calcularVigencia(fechaProximaRevision);
  if (estado === "sin-fecha") return null;

  const estilos: Record<string, { className: string; dot: string }> = {
    vigente: { className: "bg-green-50 text-green-700 ring-green-600/20", dot: "bg-estado-vigente" },
    "por-vencer": { className: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-estado-revision" },
    vencido: { className: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-estado-obsoleto" },
  };
  const texto =
    estado === "vencido"
      ? `Vencido${dias !== null ? ` hace ${Math.abs(dias)} días` : ""}`
      : estado === "por-vencer"
      ? `Vence en ${dias} días`
      : "Vigente";
  const s = estilos[estado];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {texto}
    </span>
  );
}
