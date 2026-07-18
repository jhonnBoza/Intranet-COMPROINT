"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Download, Eye, Pencil, Trash2, FolderPlus, ChevronRight,
  ChevronsUpDown, ArrowUp, ArrowDown, Inbox, X, Loader2,
} from "lucide-react";
import type { Area, UsuarioPublico, Documento } from "@/types";
import { accionesSobreDocumento, puedeSubir, puedeGestionarArea } from "@/lib/permissions";
import { FileIcon, etiquetaTipo } from "./FileIcon";
import { StatusBadge, ConfidentialityBadge } from "./StatusBadge";
import { UploadModal } from "./UploadModal";
import { EditDocModal } from "./EditDocModal";
import { FilePreviewModal } from "./FilePreviewModal";
import { formatoFecha } from "@/lib/format";

const PAGE_SIZE = 12;

const CATEGORIAS = ["todos", "Procedimiento", "Formato", "Manual", "Registro", "Plano", "Reporte"];
const ESTADOS = [
  { v: "todos", l: "Todos los estados" },
  { v: "vigente", l: "Vigente" },
  { v: "revision", l: "En revisión" },
  { v: "obsoleto", l: "Obsoleto" },
];

type SortKey = "nombre" | "fechaSubida" | "estado";

export function AreaRepository({
  area, user, docsIniciales, subInicial,
}: {
  area: Area;
  user: UsuarioPublico;
  docsIniciales: Documento[];
  subInicial?: string;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(docsIniciales);
  const [modal, setModal] = useState(false);
  const [modalCarpeta, setModalCarpeta] = useState(false);
  const [editando, setEditando] = useState<Documento | null>(null);
  const [previsualizando, setPrevisualizando] = useState<Documento | null>(null);
  // Arrastrar archivos sobre cualquier parte de la página abre el modal con ellos.
  const [arrastrando, setArrastrando] = useState(false);
  const [archivosSoltados, setArchivosSoltados] = useState<File[] | undefined>();

  async function eliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar.");
    }
  }

  function onEditado(doc: Documento) {
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    setEditando(null);
  }
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [sub, setSub] = useState(subInicial ?? "todos");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("fechaSubida");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const puedeSubirAqui = puedeSubir(user, area.slug);
  const puedeGestionar = puedeGestionarArea(user, area.slug);

  // Sincroniza el filtro de sub-área con la URL (?sub=) al navegar.
  useEffect(() => { setSub(subInicial ?? "todos"); }, [subInicial]);
  // Refresca los documentos cuando cambian los del servidor (cambio de área/carpeta).
  useEffect(() => { setDocs(docsIniciales); setSel(new Set()); }, [docsIniciales]);

  const filtrados = useMemo(() => {
    let r = docs.filter((d) => {
      if (cat !== "todos" && d.categoria !== cat) return false;
      if (estado !== "todos" && d.estado !== estado) return false;
      if (sub !== "todos" && d.subareaSlug !== sub) return false;
      if (q && !d.nombre.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    r = [...r].sort((a, b) => {
      if (sortKey === "fechaSubida") return (+new Date(a.fechaSubida) - +new Date(b.fechaSubida)) * dir;
      return a[sortKey].localeCompare(b[sortKey]) * dir;
    });
    return r;
  }, [docs, cat, estado, sub, q, sortKey, sortDir]);

  // Reinicia a la primera página cuando cambian los filtros, la búsqueda o el orden.
  useEffect(() => { setPage(1); }, [q, cat, estado, sub, sortKey, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPaginas);
  const inicio = filtrados.length === 0 ? 0 : (paginaActual - 1) * PAGE_SIZE + 1;
  const fin = Math.min(paginaActual * PAGE_SIZE, filtrados.length);
  const pagina = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  function ordenarPor(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }

  function toggleTodos() {
    setSel((prev) => prev.size === filtrados.length ? new Set() : new Set(filtrados.map((d) => d.id)));
  }
  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // Se llama por CADA archivo subido: no cerramos el modal, la cola sigue.
  function onCreado(doc: Documento) {
    setDocs((prev) => [doc, ...prev]);
  }

  function cerrarSubida() {
    setModal(false);
    setArchivosSoltados(undefined);
  }

  // --- Arrastrar archivos sobre la página completa -------------------------
  function contieneArchivos(e: React.DragEvent) {
    return Array.from(e.dataTransfer?.types ?? []).includes("Files");
  }
  function alArrastrarSobrePagina(e: React.DragEvent) {
    if (!puedeSubirAqui || !contieneArchivos(e)) return;
    e.preventDefault();
    setArrastrando(true);
  }
  function alSoltarEnPagina(e: React.DragEvent) {
    if (!puedeSubirAqui || !contieneArchivos(e)) return;
    e.preventDefault();
    setArrastrando(false);
    const archivos = Array.from(e.dataTransfer.files ?? []);
    // Si arrastran carpetas, el modal las recorre; aquí basta con abrirlo.
    setArchivosSoltados(archivos.length ? archivos : undefined);
    setModal(true);
  }

  const subActiva = sub !== "todos" ? area.subareas.find((s) => s.slug === sub)?.nombre : undefined;

  return (
    <div
      className="relative space-y-5"
      onDragOver={alArrastrarSobrePagina}
      onDragEnter={alArrastrarSobrePagina}
      onDragLeave={(e) => {
        // Solo apagamos el aviso al salir del contenedor, no de un hijo.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastrando(false);
      }}
      onDrop={alSoltarEnPagina}
    >
      {/* Aviso al arrastrar archivos sobre la página */}
      {arrastrando && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-brand-900/25 backdrop-blur-[2px]">
          <div className="rounded-2xl border-2 border-dashed border-white/80 bg-brand-800/90 px-10 py-8 text-center shadow-2xl">
            <Plus size={40} className="mx-auto mb-2 text-white" />
            <p className="text-lg font-semibold text-white">Suelta para subir a {area.nombre}</p>
            <p className="mt-0.5 text-sm text-white/70">Puedes soltar varios archivos o una carpeta completa</p>
          </div>
        </div>
      )}

      {/* Encabezado + breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-400">
            <span>Inicio</span>
            <ChevronRight size={13} />
            <span className={subActiva ? "" : "font-medium text-gold-600"}>{area.nombre}</span>
            {subActiva && (<><ChevronRight size={13} /><span className="font-medium text-gold-600">{subActiva}</span></>)}
          </nav>
          <h1 className="mt-1.5 text-xl font-semibold text-slate-800">{area.nombre}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{area.descripcion}</p>
        </div>

        {(puedeSubirAqui || puedeGestionar) && (
          <div className="flex gap-2">
            {puedeGestionar && (
              <button onClick={() => setModalCarpeta(true)} className="btn-ghost"><FolderPlus size={16} /> Nueva carpeta</button>
            )}
            {puedeSubirAqui && (
              <button onClick={() => setModal(true)} className="btn-primary"><Plus size={17} /> Subir documento</button>
            )}
          </div>
        )}
      </div>

      {/* Barra de filtros */}
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select value={cat} onChange={setCat} opciones={CATEGORIAS.map((c) => ({ v: c, l: c === "todos" ? "Todos los tipos" : c }))} />
          <Select value={sub} onChange={setSub} opciones={[{ v: "todos", l: "Todas las sub-áreas" }, ...area.subareas.map((s) => ({ v: s.slug, l: s.nombre }))]} />
          <Select value={estado} onChange={setEstado} opciones={ESTADOS} />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {sel.size > 0 && (
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            <span className="font-medium">{sel.size} seleccionado{sel.size > 1 ? "s" : ""}</span>
            <button
              onClick={() => sel.forEach((id) => window.open(`/api/documents/${id}`, "_blank"))}
              className="inline-flex items-center gap-1 text-slate-700 hover:underline"
            ><Download size={14} /> Descargar</button>
            <button onClick={() => setSel(new Set())} className="ml-auto text-slate-500 hover:underline">Limpiar</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-2xs uppercase tracking-wide text-slate-500">
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={sel.size > 0 && sel.size === filtrados.length} onChange={toggleTodos}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-800" />
                </th>
                <ThSort label="Nombre del archivo" activo={sortKey === "nombre"} dir={sortDir} onClick={() => ordenarPor("nombre")} />
                <th className="px-4 py-2.5 font-semibold">Tipo</th>
                <th className="px-4 py-2.5 font-semibold">Sub-área</th>
                <ThSort label="Fecha" activo={sortKey === "fechaSubida"} dir={sortDir} onClick={() => ordenarPor("fechaSubida")} />
                <th className="px-4 py-2.5 font-semibold">Autor</th>
                <ThSort label="Estado" activo={sortKey === "estado"} dir={sortDir} onClick={() => ordenarPor("estado")} />
                <th className="px-4 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((d) => (
                <Fila key={d.id} doc={d} area={area} user={user} seleccionado={sel.has(d.id)} onToggle={() => toggle(d.id)}
                  onVer={setPrevisualizando} onEditar={setEditando} onEliminar={eliminar} />
              ))}
            </tbody>
          </table>
        </div>

        {filtrados.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
            <Inbox size={36} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No hay documentos que coincidan</p>
            <p className="text-xs text-slate-400">Ajusta los filtros o sube un documento nuevo.</p>
          </div>
        )}

        {/* Pie */}
        {filtrados.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
            <span>Mostrando <b className="text-slate-700">{inicio}–{fin}</b> de {filtrados.length} documentos</span>
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

      {modal && (
        <UploadModal
          area={area}
          onCerrar={cerrarSubida}
          onCreado={onCreado}
          archivosIniciales={archivosSoltados}
        />
      )}

      {modalCarpeta && (
        <NuevaCarpetaModal
          areaSlug={area.slug}
          onCerrar={() => setModalCarpeta(false)}
          onCreada={() => { setModalCarpeta(false); router.refresh(); }}
        />
      )}

      {editando && (
        <EditDocModal doc={editando} onCerrar={() => setEditando(null)} onEditado={onEditado} />
      )}

      {previsualizando && (
        <FilePreviewModal doc={previsualizando} onCerrar={() => setPrevisualizando(null)} />
      )}
    </div>
  );
}

function NuevaCarpetaModal({
  areaSlug, onCerrar, onCreada,
}: { areaSlug: string; onCerrar: () => void; onCreada: () => void }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function crear() {
    if (!nombre.trim()) { setError("Ingresa un nombre de carpeta."); return; }
    setError("");
    setGuardando(true);
    const res = await fetch("/api/subareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ areaSlug, nombre }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) { setError(data.error ?? "No se pudo crear."); return; }
    onCreada();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onCerrar} />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FolderPlus size={18} className="text-slate-500" />
            <h3 className="text-base font-semibold text-slate-800">Nueva carpeta</h3>
          </div>
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>
        <div className="px-5 py-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre de la carpeta</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && crear()}
            placeholder="Ej. Ensayos No Destructivos"
            autoFocus
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          <p className="mt-2 text-xs text-slate-400">La carpeta se crea como sub-área dentro de esta área.</p>
          {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-estado-obsoleto">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button onClick={onCerrar} className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">Cancelar</button>
          <button onClick={crear} disabled={guardando} className="btn-primary">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
            Crear carpeta
          </button>
        </div>
      </div>
    </div>
  );
}

function ThSort({
  label, activo, dir, onClick,
}: { label: string; activo: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <th className="px-4 py-2.5 font-semibold">
      <button onClick={onClick} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-700">
        {label}
        {!activo && <ChevronsUpDown size={12} className="text-slate-300" />}
        {activo && (dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );
}

function Fila({
  doc, area, user, seleccionado, onToggle, onVer, onEditar, onEliminar,
}: {
  doc: Documento; area: Area; user: UsuarioPublico; seleccionado: boolean; onToggle: () => void;
  onVer: (d: Documento) => void; onEditar: (d: Documento) => void; onEliminar: (d: Documento) => void;
}) {
  const acc = accionesSobreDocumento(user, doc);
  const subarea = area.subareas.find((s) => s.slug === doc.subareaSlug)?.nombre ?? "—";

  return (
    <tr className={`border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50 ${seleccionado ? "bg-slate-50" : ""}`}>
      <td className="px-4 py-3">
        <input type="checkbox" checked={seleccionado} onChange={onToggle}
          className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-800" />
      </td>
      <td className="px-4 py-3">
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
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-medium text-slate-600">{etiquetaTipo(doc.tipo)}</span>
      </td>
      <td className="px-4 py-3 text-slate-600">{subarea}</td>
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

function Accion({
  children, titulo, activo, peligro, href, target, onClick,
}: {
  children: React.ReactNode; titulo: string; activo: boolean; peligro?: boolean;
  href?: string; target?: string; onClick?: () => void;
}) {
  if (!activo) {
    return (
      <span title={`${titulo} — sin permiso`} className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-slate-200">
        {children}
      </span>
    );
  }
  const cls = `flex h-8 w-8 items-center justify-center rounded-md transition ${
    peligro ? "text-slate-400 hover:bg-red-50 hover:text-estado-obsoleto" : "text-slate-500 hover:bg-brand-50 hover:text-brand-700"
  }`;
  if (href) {
    return (
      <a href={href} target={target} rel={target ? "noreferrer" : undefined} title={titulo} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button title={titulo} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function Select({
  value, onChange, opciones,
}: { value: string; onChange: (v: string) => void; opciones: { v: string; l: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="field-select w-full">
      {opciones.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}
