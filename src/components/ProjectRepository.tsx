"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download, Eye, Pencil, Trash2, ChevronRight, Inbox, FolderGit2 } from "lucide-react";
import type { Proyecto, UsuarioPublico, Documento } from "@/types";
import { AREAS } from "@/server/data/areas";
import { accionesSobreDocumento } from "@/lib/permissions";
import { FileIcon, etiquetaTipo } from "./FileIcon";
import { StatusBadge, ConfidentialityBadge } from "./StatusBadge";
import { EditDocModal } from "./EditDocModal";
import { FilePreviewModal } from "./FilePreviewModal";
import { formatoFecha, norm } from "@/lib/format";

const NOMBRE_AREA: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.slug, a.nombre]));

const PAGE_SIZE = 12;

const ESTADOS = [
  { v: "todos", l: "Todos los estados" },
  { v: "vigente", l: "Vigente" },
  { v: "revision", l: "En revisión" },
  { v: "obsoleto", l: "Obsoleto" },
];

export function ProjectRepository({
  proyecto,
  user,
  docsIniciales,
}: {
  proyecto: Proyecto;
  user: UsuarioPublico;
  docsIniciales: Documento[];
}) {
  const [docs, setDocs] = useState(docsIniciales);
  const [q, setQ] = useState("");
  const [area, setArea] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [editando, setEditando] = useState<Documento | null>(null);
  const [previsualizando, setPrevisualizando] = useState<Documento | null>(null);
  const [page, setPage] = useState(1);

  // Al cambiar de proyecto, el servidor entrega otros documentos: re-sincronizamos.
  useEffect(() => {
    setDocs(docsIniciales);
    setPage(1);
  }, [docsIniciales]);

  async function eliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    else { const data = await res.json().catch(() => ({})); alert(data.error ?? "No se pudo eliminar."); }
  }
  function onEditado(doc: Documento) {
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    setEditando(null);
  }

  // Áreas presentes en este proyecto (para el filtro).
  const areasPresentes = useMemo(() => {
    const set = Array.from(new Set(docs.map((d) => d.areaSlug)));
    return set.map((slug) => ({ v: slug, l: NOMBRE_AREA[slug] ?? slug }));
  }, [docs]);

  const filtrados = useMemo(() => {
    const nq = norm(q);
    return docs.filter((d) => {
      if (area !== "todos" && d.areaSlug !== area) return false;
      if (estado !== "todos" && d.estado !== estado) return false;
      if (nq && !norm(d.nombre).includes(nq)) return false;
      return true;
    });
  }, [docs, area, estado, q]);

  // Reinicia a la primera página cuando cambian los filtros o la búsqueda.
  useEffect(() => { setPage(1); }, [q, area, estado]);

  // Si el filtro de área apunta a una que ya no está presente, vuelve a "todos".
  useEffect(() => {
    if (area !== "todos" && !areasPresentes.some((a) => a.v === area)) setArea("todos");
  }, [areasPresentes, area]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPaginas);
  const inicio = filtrados.length === 0 ? 0 : (paginaActual - 1) * PAGE_SIZE + 1;
  const fin = Math.min(paginaActual * PAGE_SIZE, filtrados.length);
  const pagina = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div>
        <nav className="flex items-center gap-1 text-xs text-slate-400">
          <span>Inicio</span>
          <ChevronRight size={13} />
          <Link href="/proyectos" className="hover:text-slate-600">Proyectos</Link>
          <ChevronRight size={13} />
          <span className="font-medium text-gold-600">{proyecto.nombre}</span>
        </nav>
        <div className="mt-1.5 flex items-center gap-2.5">
          <FolderGit2 size={22} className="text-slate-400" strokeWidth={1.9} />
          <h1 className="text-xl font-semibold text-slate-800">{proyecto.nombre}</h1>
          <span className={`rounded px-2 py-0.5 text-2xs font-medium ${proyecto.estado === "en-curso" ? "bg-green-50 text-estado-vigente" : "bg-slate-100 text-slate-500"}`}>
            {proyecto.estado === "en-curso" ? "En curso" : "Cerrado"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{proyecto.descripcion}</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar por nombre de archivo…"
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select value={area} onChange={setArea} opciones={[{ v: "todos", l: "Todas las áreas" }, ...areasPresentes]} />
          <Select value={estado} onChange={setEstado} opciones={ESTADOS} />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {/* Tabla — escritorio */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-2xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Documento</th>
                <th className="px-4 py-2.5 font-semibold">Área</th>
                <th className="px-4 py-2.5 font-semibold">Tipo</th>
                <th className="px-4 py-2.5 font-semibold">Fecha</th>
                <th className="px-4 py-2.5 font-semibold">Autor</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
                <th className="px-4 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((d) => (
                <Fila key={d.id} doc={d} user={user} onVer={setPrevisualizando} onEditar={setEditando} onEliminar={eliminar} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Tarjetas — móvil */}
        <ul className="divide-y divide-slate-100 sm:hidden">
          {pagina.map((d) => (
            <TarjetaMovil key={d.id} doc={d} user={user} onVer={setPrevisualizando} onEditar={setEditando} onEliminar={eliminar} />
          ))}
        </ul>

        {filtrados.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
            <Inbox size={36} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No hay documentos que coincidan</p>
            <p className="text-xs text-slate-400">Ajusta los filtros del proyecto.</p>
          </div>
        )}

        {filtrados.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
            <span>
              Mostrando <b className="text-slate-700">{inicio}–{fin}</b> de {filtrados.length} documento{filtrados.length !== 1 ? "s" : ""} del proyecto accesible{filtrados.length !== 1 ? "s" : ""} para tu rol
            </span>
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
      </div>

      {editando && (
        <EditDocModal doc={editando} onCerrar={() => setEditando(null)} onEditado={onEditado} />
      )}

      {previsualizando && (
        <FilePreviewModal doc={previsualizando} onCerrar={() => setPrevisualizando(null)} />
      )}
    </div>
  );
}

function Fila({
  doc, user, onVer, onEditar, onEliminar,
}: {
  doc: Documento; user: UsuarioPublico;
  onVer: (d: Documento) => void; onEditar: (d: Documento) => void; onEliminar: (d: Documento) => void;
}) {
  const acc = accionesSobreDocumento(user, doc);
  return (
    <tr className="group border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50">
      <td className="border-l-2 border-l-transparent px-4 py-3 transition-colors group-hover:border-l-gold-400/70">
        <div className="flex items-center gap-3">
          <FileIcon tipo={doc.tipo} size={17} />
          <div className="min-w-0">
            <p className="max-w-xs truncate font-medium text-slate-700">{doc.nombre}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-2xs tabular text-slate-400">v{doc.version} · {doc.tamano}</span>
              <ConfidentialityBadge nivel={doc.confidencialidad} />
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-medium text-slate-600">{NOMBRE_AREA[doc.areaSlug] ?? doc.areaSlug}</span>
      </td>
      <td className="px-4 py-3">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-medium text-slate-600">{etiquetaTipo(doc.tipo)}</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap tabular text-slate-500">{formatoFecha(doc.fechaSubida)}</td>
      <td className="px-4 py-3 text-slate-600">{doc.autor}</td>
      <td className="px-4 py-3"><StatusBadge estado={doc.estado} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-0.5">
          <Accion titulo="Vista previa" activo={acc.ver} onClick={() => onVer(doc)}><Eye size={16} /></Accion>
          <Accion titulo="Descargar" activo={acc.descargar && !doc.soloVista} href={`/api/documents/${doc.id}`}><Download size={16} /></Accion>
          <Accion titulo="Editar" activo={acc.editar} onClick={() => onEditar(doc)}><Pencil size={16} /></Accion>
          <Accion titulo="Eliminar" activo={acc.eliminar} peligro onClick={() => onEliminar(doc)}><Trash2 size={16} /></Accion>
        </div>
      </td>
    </tr>
  );
}

function TarjetaMovil({
  doc, user, onVer, onEditar, onEliminar,
}: {
  doc: Documento; user: UsuarioPublico;
  onVer: (d: Documento) => void; onEditar: (d: Documento) => void; onEliminar: (d: Documento) => void;
}) {
  const acc = accionesSobreDocumento(user, doc);
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <FileIcon tipo={doc.tipo} size={20} />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-slate-800">{doc.nombre}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-slate-500">
            <StatusBadge estado={doc.estado} />
            <ConfidentialityBadge nivel={doc.confidencialidad} />
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{NOMBRE_AREA[doc.areaSlug] ?? doc.areaSlug}</span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-2xs text-slate-500">
            <span>{doc.autor}</span>
            <span className="tabular">{formatoFecha(doc.fechaSubida)}</span>
            <span className="tabular">v{doc.version}</span>
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {acc.ver && (
              <button onClick={() => onVer(doc)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">
                <Eye size={14} /> Ver
              </button>
            )}
            {acc.descargar && !doc.soloVista && (
              <a href={`/api/documents/${doc.id}`} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">
                <Download size={14} /> Descargar
              </a>
            )}
            {acc.editar && (
              <button onClick={() => onEditar(doc)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">
                <Pencil size={14} /> Editar
              </button>
            )}
            {acc.eliminar && (
              <button onClick={() => onEliminar(doc)} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-estado-obsoleto">
                <Trash2 size={14} /> Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function Accion({
  children, titulo, activo, peligro, href, target, onClick,
}: {
  children: React.ReactNode; titulo: string; activo: boolean; peligro?: boolean;
  href?: string; target?: string; onClick?: () => void;
}) {
  if (!activo) {
    return <span title={`${titulo} — sin permiso`} className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-slate-200">{children}</span>;
  }
  const cls = `flex h-8 w-8 items-center justify-center rounded-md transition ${peligro ? "text-slate-400 hover:bg-red-50 hover:text-estado-obsoleto" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`;
  if (href) {
    return <a href={href} target={target} rel={target ? "noreferrer" : undefined} title={titulo} className={cls}>{children}</a>;
  }
  return (
    <button title={titulo} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function Select({ value, onChange, opciones }: { value: string; onChange: (v: string) => void; opciones: { v: string; l: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="field-select w-full">
      {opciones.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}
