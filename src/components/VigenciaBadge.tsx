import { calcularVigencia } from "@/lib/vigencia";

/** Semáforo de vigencia documental (ISO): vigente / por vencer / vencido. */
export function VigenciaBadge({
  fechaProximaRevision,
  compacto,
}: {
  fechaProximaRevision?: string | null;
  compacto?: boolean;
}) {
  const { estado, dias } = calcularVigencia(fechaProximaRevision);
  if (estado === "sin-fecha") return null;

  const estilos: Record<string, string> = {
    vigente: "bg-estado-vigente/10 text-estado-vigente",
    "por-vencer": "bg-amber-100 text-amber-700",
    vencido: "bg-red-100 text-estado-obsoleto",
  };
  const texto =
    estado === "vencido"
      ? `Vencido${dias !== null ? ` hace ${Math.abs(dias)}d` : ""}`
      : estado === "por-vencer"
      ? `Vence en ${dias}d`
      : "Vigente";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ${estilos[estado]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {compacto && estado === "vigente" ? "Vigente" : texto}
    </span>
  );
}
