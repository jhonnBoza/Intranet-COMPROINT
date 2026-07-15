"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Search, ScrollText } from "lucide-react";
import { ETIQUETA_ROL } from "@/lib/permissions";
import { formatoFechaHora } from "@/lib/format";
import type { Rol } from "@/types";

interface Evento {
  id: string; fecha: string; usuarioNombre: string; rol: string;
  accion: string; entidad: string; detalle: string;
}
interface Datos { eventos: Evento[]; total: number; page: number; totalPaginas: number }

// Color del chip según la acción.
function claseAccion(a: string): string {
  if (/subió|creó|publicó|inició/.test(a)) return "bg-green-50 text-estado-vigente";
  if (/eliminó/.test(a)) return "bg-red-50 text-estado-obsoleto";
  if (/editó/.test(a)) return "bg-amber-50 text-estado-revision";
  return "bg-slate-100 text-slate-600"; // vio / descargó
}

export function AuditLog({ inicial }: { inicial: Datos }) {
  const [datos, setDatos] = useState<Datos>(inicial);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setCargando(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/audit?page=${page}&q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (res.ok) setDatos(d);
      setCargando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, page]);

  useEffect(() => { setPage(1); }, [q]);

  return (
    <div className="space-y-5">
      <div>
        <nav className="flex items-center gap-1 text-xs text-slate-400">
          <span>Inicio</span><ChevronRight size={13} /><span className="font-medium text-slate-600">Administración</span>
          <ChevronRight size={13} /><span className="font-medium text-gold-600">Bitácora de auditoría</span>
        </nav>
        <h1 className="mt-1.5 flex items-center gap-2 text-xl font-semibold text-slate-800">
          <ScrollText size={20} className="text-slate-400" /> Bitácora de auditoría
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">Registro de acciones: quién hizo qué y cuándo (trazabilidad ISO 9001).</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por usuario, acción o elemento…"
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-2xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Fecha y hora</th>
                <th className="px-4 py-2.5 font-semibold">Usuario</th>
                <th className="px-4 py-2.5 font-semibold">Acción</th>
                <th className="px-4 py-2.5 font-semibold">Elemento</th>
              </tr>
            </thead>
            <tbody className={cargando ? "opacity-50" : ""}>
              {datos.eventos.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 whitespace-nowrap tabular text-slate-500">{formatoFechaHora(e.fecha)}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-slate-700">{e.usuarioNombre}</span>
                    <span className="ml-1.5 text-2xs text-slate-400">{ETIQUETA_ROL[e.rol as Rol] ?? e.rol}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-2xs font-medium ${claseAccion(e.accion)}`}>{e.accion}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    <span className="text-2xs uppercase tracking-wide text-slate-400">{e.entidad}</span>
                    <span className="ml-1.5 max-w-xs truncate align-middle">{e.detalle}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {datos.eventos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
            <ScrollText size={36} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">Sin registros</p>
            <p className="text-xs text-slate-400">Las acciones de los usuarios aparecerán aquí.</p>
          </div>
        )}

        {datos.total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
            <span><b className="text-slate-700">{datos.total}</b> registro{datos.total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={datos.page <= 1}
                className="rounded border border-slate-200 px-2 py-1 text-slate-500 disabled:opacity-40 hover:bg-slate-50">Anterior</button>
              <span className="rounded bg-ink-900 px-2.5 py-1 font-medium text-white">{datos.page}</span>
              <span className="text-slate-400">de {datos.totalPaginas}</span>
              <button onClick={() => setPage((p) => Math.min(datos.totalPaginas, p + 1))} disabled={datos.page >= datos.totalPaginas}
                className="rounded border border-slate-200 px-2 py-1 text-slate-500 disabled:opacity-40 hover:bg-slate-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
