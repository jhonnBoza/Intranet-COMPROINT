"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ArrowRight } from "lucide-react";
import type { Documento } from "@/types";
import { FileIcon } from "./FileIcon";
import { VigenciaBadge } from "./VigenciaBadge";
import { formatoFecha } from "@/lib/format";
import { calcularVigencia } from "@/lib/vigencia";
import { AREAS } from "@/server/data/areas";

const NOMBRE_AREA: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.slug, a.nombre]));

type Filtro = "todos" | "vencido" | "por-vencer";

export function VencimientosPanel({ documentosIniciales }: { documentosIniciales: Documento[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [area, setArea] = useState("todos");

  const conEstado = useMemo(
    () => documentosIniciales.map((d) => ({ d, v: calcularVigencia(d.fechaProximaRevision) })),
    [documentosIniciales],
  );
  const vencidos = conEstado.filter((x) => x.v.estado === "vencido").length;
  const porVencer = conEstado.filter((x) => x.v.estado === "por-vencer").length;

  const areasPresentes = useMemo(() => {
    const set = Array.from(new Set(documentosIniciales.map((d) => d.areaSlug)));
    return set.map((slug) => ({ v: slug, l: NOMBRE_AREA[slug] ?? slug }));
  }, [documentosIniciales]);

  const lista = conEstado.filter(
    (x) => (filtro === "todos" || x.v.estado === filtro) && (area === "todos" || x.d.areaSlug === area),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <CalendarClock size={20} className="text-brand-700" /> Vencimientos
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Documentos vencidos o por vencer (próximos 30 días). Ábrelos para revisarlos y actualizar su fecha de aprobación.
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-2xl font-semibold tabular text-estado-obsoleto">{vencidos}</p>
          <p className="text-xs font-medium text-red-700/80">Vencidos</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-2xl font-semibold tabular text-amber-700">{porVencer}</p>
          <p className="text-xs font-medium text-amber-700/80">Por vencer (≤30 días)</p>
        </div>
      </div>

      {/* Filtros */}
      {documentosIniciales.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            {([["todos", "Todos"], ["vencido", "Vencidos"], ["por-vencer", "Por vencer"]] as [Filtro, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFiltro(v)}
                className={`rounded-md px-3 py-1 font-medium transition ${filtro === v ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {areasPresentes.length > 1 && (
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="field-select h-8 py-0 text-sm"
              aria-label="Filtrar por área"
            >
              <option value="todos">Todas las áreas</option>
              {areasPresentes.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-slate-500">
            <CheckCircle2 size={34} className="text-estado-vigente" />
            <p className="text-sm">
              {documentosIniciales.length === 0 ? "Nada por vencer. Toda la documentación al día." : "Nada coincide con el filtro."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lista.map(({ d }) => (
              <li key={d.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileIcon tipo={d.tipo} size={18} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {d.codigo && <span className="mr-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-2xs font-semibold tabular text-brand-700">{d.codigo}</span>}
                      {d.nombre}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <VigenciaBadge fechaProximaRevision={d.fechaProximaRevision} />
                      <span>Revisión: {d.fechaProximaRevision ? formatoFecha(d.fechaProximaRevision) : "—"}</span>
                      <span className="text-slate-300">·</span>
                      <span>{NOMBRE_AREA[d.areaSlug] ?? d.areaSlug}</span>
                    </p>
                  </div>
                </div>
                <Link
                  href={`/area/${d.areaSlug}?q=${encodeURIComponent(d.nombre)}`}
                  className="inline-flex shrink-0 items-center gap-1 self-start rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:self-auto"
                >
                  Ir a revisar <ArrowRight size={13} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
