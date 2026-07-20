"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, ArrowRight } from "lucide-react";
import type { Documento } from "@/types";
import { FileIcon } from "./FileIcon";
import { VigenciaBadge } from "./VigenciaBadge";
import { formatoFecha } from "@/lib/format";
import { AREAS } from "@/server/data/areas";

const NOMBRE_AREA: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.slug, a.nombre]));

export function VencimientosPanel({ documentosIniciales }: { documentosIniciales: Documento[] }) {
  const docs = documentosIniciales;

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

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-slate-500">
            <CheckCircle2 size={34} className="text-estado-vigente" />
            <p className="text-sm">Nada por vencer. Toda la documentación al día.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.map((d) => (
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
