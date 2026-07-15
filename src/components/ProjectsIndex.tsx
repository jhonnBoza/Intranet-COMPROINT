"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, FolderGit2, ChevronRight, FileText, Plus, X, Loader2 } from "lucide-react";
import type { Proyecto } from "@/types";

interface Item {
  proyecto: Proyecto;
  docs: number;
}

const PAGE_SIZE = 9;

export function ProjectsIndex({ items, puedeCrear }: { items: Item[]; puedeCrear: boolean }) {
  const [lista, setLista] = useState(items);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);

  const filtrados = useMemo(() => {
    return lista.filter(({ proyecto: p }) => {
      if (estado !== "todos" && p.estado !== estado) return false;
      if (q) {
        const t = `${p.nombre} ${p.descripcion}`.toLowerCase();
        if (!t.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [lista, q, estado]);

  // Reinicia a la primera página cuando cambia la búsqueda o el filtro de estado.
  useEffect(() => { setPage(1); }, [q, estado]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPaginas);
  const inicio = filtrados.length === 0 ? 0 : (paginaActual - 1) * PAGE_SIZE + 1;
  const fin = Math.min(paginaActual * PAGE_SIZE, filtrados.length);
  const pagina = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  function onCreado(p: Proyecto) {
    setLista((prev) => [...prev, { proyecto: p, docs: 0 }]);
    setModal(false);
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-400">
            <span>Inicio</span>
            <ChevronRight size={13} />
            <span className="font-medium text-gold-600">Proyectos</span>
          </nav>
          <h1 className="mt-1.5 text-xl font-semibold text-slate-800">Proyectos</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Expedientes transversales — documentos de varias áreas agrupados por proyecto.
          </p>
        </div>
        {puedeCrear && (
          <button onClick={() => setModal(true)} className="btn-primary shrink-0">
            <Plus size={17} /> Nuevo proyecto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar proyecto…"
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="field-select">
          <option value="todos">Todos los estados</option>
          <option value="en-curso">En curso</option>
          <option value="cerrado">Cerrado</option>
        </select>
      </div>

      {/* Grilla de proyectos */}
      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagina.map(({ proyecto: p, docs }) => (
            <Link
              key={p.slug}
              href={`/proyecto/${p.slug}`}
              className="group flex flex-col rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-panel"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors group-hover:bg-gold-50 group-hover:text-gold-600">
                  <FolderGit2 size={22} strokeWidth={1.9} />
                </span>
                <span className={`rounded px-2 py-0.5 text-2xs font-medium ${p.estado === "en-curso" ? "bg-green-50 text-estado-vigente" : "bg-slate-100 text-slate-500"}`}>
                  {p.estado === "en-curso" ? "En curso" : "Cerrado"}
                </span>
              </div>
              <p className="mt-3 font-semibold text-slate-800">{p.nombre}</p>
              <p className="mt-1 flex-1 text-sm text-slate-500">{p.descripcion}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <FileText size={14} className="text-slate-400" />
                  {docs} documento{docs !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-slate-800">
                  Abrir <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {filtrados.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500">
          <span>Mostrando <b className="text-slate-700">{inicio}–{fin}</b> de {filtrados.length} proyecto{filtrados.length !== 1 ? "s" : ""}</span>
          {totalPaginas > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="rounded border border-slate-200 px-2 py-1 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              >Anterior</button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={
                    n === paginaActual
                      ? "rounded bg-ink-900 px-2.5 py-1 font-medium text-white ring-1 ring-gold-400/60 ring-offset-1 ring-offset-white"
                      : "rounded border border-slate-200 px-2.5 py-1 text-slate-500 transition hover:bg-slate-50"
                  }
                >{n}</button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="rounded border border-slate-200 px-2 py-1 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              >Siguiente</button>
            </div>
          )}
        </div>
      )}

      {filtrados.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-16 text-center">
          <FolderGit2 size={36} className="text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No se encontraron proyectos</p>
          <p className="text-xs text-slate-400">Ajusta la búsqueda o el filtro de estado.</p>
        </div>
      )}

      {modal && <ModalProyecto onCerrar={() => setModal(false)} onCreado={onCreado} />}
    </div>
  );
}

function ModalProyecto({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (p: Proyecto) => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<"en-curso" | "cerrado">("en-curso");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) { setError("Ingresa un nombre de proyecto."); return; }
    setError("");
    setGuardando(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, descripcion, estado }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) { setError(data.error ?? "No se pudo crear."); return; }
    onCreado(data.proyecto);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onCerrar} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FolderGit2 size={18} className="text-slate-500" />
            <h3 className="text-base font-semibold text-slate-800">Nuevo proyecto</h3>
          </div>
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre del proyecto</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Proyecto 3 · Modernización de Calderas"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Breve descripción del alcance del proyecto…"
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value as any)} className="field-select w-full">
              <option value="en-curso">En curso</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Luego podrás asignarle documentos desde cada área al subirlos.
          </p>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-estado-obsoleto">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button onClick={onCerrar} className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="btn-primary">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Crear proyecto
          </button>
        </div>
      </div>
    </div>
  );
}
