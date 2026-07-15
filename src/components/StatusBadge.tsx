import type { EstadoDocumento, Confidencialidad } from "@/types";
import { Lock, Users, Globe } from "lucide-react";

// Badge de estado documental (verde / ámbar / rojo).
const ESTADO: Record<EstadoDocumento, { label: string; className: string; dot: string }> = {
  vigente:  { label: "Vigente",     className: "bg-green-50 text-green-700 ring-green-600/20", dot: "bg-estado-vigente" },
  revision: { label: "En revisión", className: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-estado-revision" },
  obsoleto: { label: "Obsoleto",    className: "bg-red-50 text-red-700 ring-red-600/20",       dot: "bg-estado-obsoleto" },
};

export function StatusBadge({ estado }: { estado: EstadoDocumento }) {
  const s = ESTADO[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// Badge de confidencialidad.
const CONF: Record<Confidencialidad, { label: string; Icon: typeof Lock; className: string }> = {
  publico:     { label: "Público",     Icon: Globe, className: "bg-slate-100 text-slate-600" },
  jefes:       { label: "Solo jefes",  Icon: Users, className: "bg-blue-50 text-brand-700" },
  restringido: { label: "Restringido", Icon: Lock,  className: "bg-purple-50 text-purple-700" },
};

export function ConfidentialityBadge({ nivel }: { nivel: Confidencialidad }) {
  const c = CONF[nivel];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${c.className}`}>
      <c.Icon size={11} strokeWidth={2} />
      {c.label}
    </span>
  );
}
