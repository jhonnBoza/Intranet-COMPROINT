"use client";

import { useState } from "react";
import { Pencil, X, Loader2 } from "lucide-react";
import type { Documento } from "@/types";

const ESTADOS = [
  { v: "vigente", l: "Vigente" },
  { v: "revision", l: "En revisión" },
  { v: "obsoleto", l: "Obsoleto" },
];
const CONF = [
  { v: "publico", l: "Público — toda el área" },
  { v: "jefes", l: "Solo jefes" },
  { v: "restringido", l: "Restringido — solo gerencia" },
];

export function EditDocModal({
  doc, onCerrar, onEditado,
}: { doc: Documento; onCerrar: () => void; onEditado: (d: Documento) => void }) {
  const [estado, setEstado] = useState(doc.estado);
  const [confidencialidad, setConfidencialidad] = useState(doc.confidencialidad);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setError("");
    setGuardando(true);
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, confidencialidad }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) { setError(data.error ?? "No se pudo guardar."); return; }
    onEditado(data.documento);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onCerrar} />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Pencil size={17} className="text-slate-500" />
            <h3 className="text-base font-semibold text-slate-800">Editar documento</h3>
          </div>
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="truncate text-sm font-medium text-slate-600">{doc.nombre}</p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value as any)} className="field-select w-full">
              {ESTADOS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Confidencialidad</label>
            <select value={confidencialidad} onChange={(e) => setConfidencialidad(e.target.value as any)} className="field-select w-full">
              {CONF.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-estado-obsoleto">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button onClick={onCerrar} className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="btn-primary">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
