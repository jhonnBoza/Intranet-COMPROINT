"use client";

import { useState } from "react";
import { Trash2, RotateCcw, Loader2, Inbox } from "lucide-react";
import type { Documento } from "@/types";
import { FileIcon } from "./FileIcon";
import { formatoFecha } from "@/lib/format";
import { useConfirm, useToast } from "./Feedback";

type DocPapelera = Documento & { eliminadoEn?: string; eliminadoPor?: string };

export function TrashPanel({ documentosIniciales }: { documentosIniciales: DocPapelera[] }) {
  const [docs, setDocs] = useState<DocPapelera[]>(documentosIniciales);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  async function restaurar(id: string) {
    setOcupado(id);
    const res = await fetch(`/api/trash/${id}`, { method: "POST" });
    setOcupado(null);
    if (res.ok) { setDocs((prev) => prev.filter((d) => d.id !== id)); toast("Documento restaurado."); }
    else { const d = await res.json().catch(() => ({})); toast(d.error ?? "No se pudo restaurar.", "error"); }
  }

  async function eliminarDefinitivo(id: string, nombre: string) {
    const ok = await confirm({
      titulo: "Eliminar definitivamente",
      mensaje: `“${nombre}” se borrará para siempre, junto con su archivo. Esta acción no se puede deshacer.`,
      confirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;
    setOcupado(id);
    const res = await fetch(`/api/trash/${id}`, { method: "DELETE" });
    setOcupado(null);
    if (res.ok) { setDocs((prev) => prev.filter((d) => d.id !== id)); toast("Documento eliminado definitivamente."); }
    else { const d = await res.json().catch(() => ({})); toast(d.error ?? "No se pudo eliminar.", "error"); }
  }

  async function vaciar() {
    const ok = await confirm({
      titulo: "Vaciar la papelera",
      mensaje: `Se borrarán definitivamente ${docs.length} documento${docs.length !== 1 ? "s" : ""} y sus archivos. Esta acción no se puede deshacer.`,
      confirmar: "Vaciar papelera",
      peligro: true,
    });
    if (!ok) return;
    setOcupado("__all__");
    const res = await fetch(`/api/trash`, { method: "DELETE" });
    setOcupado(null);
    if (res.ok) { setDocs([]); toast("Papelera vaciada."); }
    else { const d = await res.json().catch(() => ({})); toast(d.error ?? "No se pudo vaciar la papelera.", "error"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Papelera</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Documentos eliminados. Puedes restaurarlos o borrarlos definitivamente.
          </p>
        </div>
        {docs.length > 0 && (
          <button
            onClick={vaciar}
            disabled={ocupado === "__all__"}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-estado-obsoleto hover:bg-red-50 disabled:opacity-50"
          >
            {ocupado === "__all__" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Vaciar papelera
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-slate-400">
            <Inbox size={34} className="text-slate-300" />
            <p className="text-sm">La papelera está vacía.</p>
          </div>
        ) : (
          <>
            {/* Tabla — escritorio */}
            <div className="hidden overflow-x-auto sm:block">
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
                            disabled={!!ocupado}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {ocupado === d.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restaurar
                          </button>
                          <button
                            onClick={() => eliminarDefinitivo(d.id, d.nombre)}
                            disabled={!!ocupado}
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

            {/* Tarjetas — móvil */}
            <ul className="divide-y divide-slate-100 sm:hidden">
              {docs.map((d) => (
                <li key={d.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <FileIcon tipo={d.tipo} size={20} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-slate-800">{d.nombre}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-slate-500">
                        <span className="capitalize">{d.areaSlug}</span>
                        <span>{d.eliminadoPor ?? "—"}</span>
                        {d.eliminadoEn && <span>{formatoFecha(d.eliminadoEn)}</span>}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                          onClick={() => restaurar(d.id)}
                          disabled={!!ocupado}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                        >
                          {ocupado === d.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restaurar
                        </button>
                        <button
                          onClick={() => eliminarDefinitivo(d.id, d.nombre)}
                          disabled={!!ocupado}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-estado-obsoleto disabled:opacity-50"
                        >
                          <Trash2 size={13} /> Borrar
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
