"use client";

import { useState } from "react";
import { Trash2, RotateCcw, Loader2, Inbox } from "lucide-react";
import type { Documento } from "@/types";
import { FileIcon } from "./FileIcon";
import { formatoFecha } from "@/lib/format";

type DocPapelera = Documento & { eliminadoEn?: string; eliminadoPor?: string };

export function TrashPanel({ documentosIniciales }: { documentosIniciales: DocPapelera[] }) {
  const [docs, setDocs] = useState<DocPapelera[]>(documentosIniciales);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function restaurar(id: string) {
    setOcupado(id);
    const res = await fetch(`/api/trash/${id}`, { method: "POST" });
    setOcupado(null);
    if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== id));
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? "No se pudo restaurar."); }
  }

  async function eliminarDefinitivo(id: string, nombre: string) {
    if (!confirm(`Eliminar DEFINITIVAMENTE "${nombre}"? Esta acción NO se puede deshacer y borra el archivo.`)) return;
    setOcupado(id);
    const res = await fetch(`/api/trash/${id}`, { method: "DELETE" });
    setOcupado(null);
    if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== id));
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? "No se pudo eliminar."); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Papelera</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Documentos eliminados. Puedes restaurarlos o borrarlos definitivamente.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-slate-400">
            <Inbox size={34} className="text-slate-300" />
            <p className="text-sm">La papelera está vacía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-2xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Documento</th>
                  <th className="px-4 py-2.5 font-medium">Área</th>
                  <th className="px-4 py-2.5 font-medium">Eliminado por</th>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <FileIcon tipo={d.tipo} size={16} />
                        <span className="max-w-[260px] truncate font-medium text-slate-700">{d.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-slate-500">{d.areaSlug}</td>
                    <td className="px-4 py-2.5 text-slate-500">{d.eliminadoPor ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{d.eliminadoEn ? formatoFecha(d.eliminadoEn) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => restaurar(d.id)}
                          disabled={ocupado === d.id}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {ocupado === d.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restaurar
                        </button>
                        <button
                          onClick={() => eliminarDefinitivo(d.id, d.nombre)}
                          disabled={ocupado === d.id}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-estado-obsoleto hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={13} /> Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
