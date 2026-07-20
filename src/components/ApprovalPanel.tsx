"use client";

import { useState } from "react";
import { CheckCircle2, Eye, Loader2, ClipboardCheck } from "lucide-react";
import type { Documento } from "@/types";
import { FileIcon } from "./FileIcon";
import { ConfidentialityBadge } from "./StatusBadge";
import { FilePreviewModal } from "./FilePreviewModal";
import { formatoFecha } from "@/lib/format";
import { AREAS } from "@/server/data/areas";

const NOMBRE_AREA: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.slug, a.nombre]));

export function ApprovalPanel({ documentosIniciales }: { documentosIniciales: Documento[] }) {
  const [docs, setDocs] = useState(documentosIniciales);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [previsualizando, setPrevisualizando] = useState<Documento | null>(null);

  async function decidir(doc: Documento, estado: "vigente" | "obsoleto") {
    setOcupado(doc.id);
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setOcupado(null);
    if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? "No se pudo actualizar."); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <ClipboardCheck size={20} className="text-brand-700" /> Pendientes de aprobar
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Documentos en revisión que esperan tu aprobación.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-slate-500">
            <CheckCircle2 size={34} className="text-estado-vigente" />
            <p className="text-sm">No hay documentos pendientes. Todo al día. 👍</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileIcon tipo={d.tipo} size={18} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{d.nombre}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>{NOMBRE_AREA[d.areaSlug] ?? d.areaSlug}</span>
                      <span className="text-slate-300">·</span>
                      <span>{d.autor}</span>
                      <span className="text-slate-300">·</span>
                      <span>{formatoFecha(d.fechaSubida)}</span>
                      <ConfidentialityBadge nivel={d.confidencialidad} />
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setPrevisualizando(d)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  ><Eye size={14} /> Ver</button>
                  <button
                    onClick={() => decidir(d, "obsoleto")}
                    disabled={ocupado === d.id}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >Rechazar</button>
                  <button
                    onClick={() => decidir(d, "vigente")}
                    disabled={ocupado === d.id}
                    className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                  >
                    {ocupado === d.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Aprobar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {previsualizando && (
        <FilePreviewModal doc={previsualizando} onCerrar={() => setPrevisualizando(null)} />
      )}
    </div>
  );
}
