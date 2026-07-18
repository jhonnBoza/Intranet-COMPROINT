"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UploadCloud, X, Loader2, FolderUp, CheckCircle2, AlertCircle, Trash2, FileText } from "lucide-react";
import type { Area, Documento } from "@/types";
import { MAX_ARCHIVO_BYTES } from "@/lib/validation";

interface Props {
  area: Area;
  onCerrar: () => void;
  onCreado: (doc: Documento) => void;
  /** Archivos que vienen de un arrastre sobre la página. */
  archivosIniciales?: File[];
}

const CATEGORIAS = ["Procedimiento", "Formato", "Manual", "Registro", "Plano", "Reporte"] as const;

/** Archivos de sistema que nunca queremos subir al arrastrar carpetas. */
const IGNORAR = /^(\.DS_Store|Thumbs\.db|desktop\.ini|\.localized)$/i;

/** Cuántos archivos se suben a la vez (equilibra velocidad y carga del servidor). */
const EN_PARALELO = 3;

type Estado = "pendiente" | "subiendo" | "ok" | "error";
interface Item {
  id: number;
  file: File;
  ruta: string; // nombre, o "carpeta/nombre" si vino de una carpeta
  estado: Estado;
  error?: string;
}

/** Formatea bytes de forma legible (KB por debajo de 1 MB). */
function formatoTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Recorre una entrada del explorador (archivo o carpeta) y devuelve todos los
 * archivos que contenga, incluidas las sub-carpetas.
 */
function recorrerEntrada(entry: any, prefijo: string, salida: { file: File; ruta: string }[]): Promise<void> {
  return new Promise((resolve) => {
    if (!entry) return resolve();
    if (entry.isFile) {
      entry.file(
        (f: File) => {
          if (!IGNORAR.test(f.name)) salida.push({ file: f, ruta: prefijo + f.name });
          resolve();
        },
        () => resolve(),
      );
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      const leerLote = () => {
        reader.readEntries(
          async (lote: any[]) => {
            // readEntries devuelve como máximo 100 por llamada: hay que insistir.
            if (!lote.length) return resolve();
            for (const sub of lote) await recorrerEntrada(sub, `${prefijo}${entry.name}/`, salida);
            leerLote();
          },
          () => resolve(),
        );
      };
      leerLote();
      return;
    }
    resolve();
  });
}

export function UploadModal({ area, onCerrar, onCreado, archivosIniciales }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Procedimiento");
  const [subarea, setSubarea] = useState(area.subareas[0]?.slug ?? "");
  const [confidencialidad, setConfidencialidad] = useState<Documento["confidencialidad"]>("publico");
  const [soloVista, setSoloVista] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [error, setError] = useState("");
  const idRef = useRef(0);
  const inputCarpeta = useRef<HTMLInputElement>(null);
  // Se monta en un portal sobre <body>: así el modal no hereda márgenes ni
  // recortes del contenedor (p. ej. el space-y del repositorio).
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Archivos que llegan de un arrastre sobre la página.
  useEffect(() => {
    if (archivosIniciales?.length) {
      agregar(archivosIniciales.map((f) => ({ file: f, ruta: f.name })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function agregar(nuevos: { file: File; ruta: string }[]) {
    if (!nuevos.length) return;
    setError("");
    setTerminado(false);
    setItems((prev) => {
      // Evita duplicados exactos (misma ruta y tamaño) si sueltan dos veces.
      const clave = (r: string, s: number) => `${r}::${s}`;
      const yaHay = new Set(prev.map((i) => clave(i.ruta, i.file.size)));
      const add: Item[] = [];
      for (const n of nuevos) {
        if (yaHay.has(clave(n.ruta, n.file.size))) continue;
        yaHay.add(clave(n.ruta, n.file.size));
        add.push({
          id: idRef.current++,
          file: n.file,
          ruta: n.ruta,
          estado: n.file.size > MAX_ARCHIVO_BYTES ? "error" : "pendiente",
          error: n.file.size > MAX_ARCHIVO_BYTES
            ? `Supera el límite de ${(MAX_ARCHIVO_BYTES / 1024 / 1024).toFixed(0)} MB`
            : undefined,
        });
      }
      return [...prev, ...add];
    });
  }

  /** Soltar: soporta archivos sueltos Y carpetas completas. */
  async function alSoltar(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dt = e.dataTransfer;
    // webkitGetAsEntry debe leerse de forma síncrona, antes de cualquier await.
    const entradas: any[] = [];
    for (const item of Array.from(dt.items ?? [])) {
      const entry = (item as any).webkitGetAsEntry?.();
      if (entry) entradas.push(entry);
    }
    if (entradas.length) {
      const salida: { file: File; ruta: string }[] = [];
      for (const en of entradas) await recorrerEntrada(en, "", salida);
      agregar(salida);
    } else {
      agregar(Array.from(dt.files).filter((f) => !IGNORAR.test(f.name)).map((f) => ({ file: f, ruta: f.name })));
    }
  }

  function leerBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(((reader.result as string).split(",")[1]) ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  function marcar(id: number, cambios: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...cambios } : i)));
  }

  async function subirUno(item: Item) {
    marcar(item.id, { estado: "subiendo", error: undefined });
    try {
      const contenidoBase64 = await leerBase64(item.file);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: item.file.name,
          categoria,
          areaSlug: area.slug,
          subareaSlug: subarea,
          confidencialidad,
          tamano: formatoTamano(item.file.size),
          soloVista,
          contenidoBase64,
          mime: item.file.type || "application/octet-stream",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        marcar(item.id, { estado: "error", error: data.error ?? "No se pudo subir." });
        return;
      }
      marcar(item.id, { estado: "ok" });
      onCreado(data.documento);
    } catch {
      marcar(item.id, { estado: "error", error: "Error de conexión." });
    }
  }

  /** Sube la cola con varios archivos a la vez. */
  async function subirTodo() {
    const cola = items.filter((i) => i.estado === "pendiente");
    if (!cola.length) {
      setError("No hay archivos pendientes por subir.");
      return;
    }
    setError("");
    setSubiendo(true);
    let cursor = 0;
    async function trabajador() {
      while (cursor < cola.length) {
        const actual = cola[cursor++];
        await subirUno(actual);
      }
    }
    await Promise.all(Array.from({ length: Math.min(EN_PARALELO, cola.length) }, trabajador));
    setSubiendo(false);
    setTerminado(true);
  }

  const total = items.length;
  const ok = items.filter((i) => i.estado === "ok").length;
  const fallidos = items.filter((i) => i.estado === "error").length;
  const pendientes = items.filter((i) => i.estado === "pendiente").length;
  const enCurso = items.filter((i) => i.estado === "subiendo").length;
  const progreso = total ? Math.round(((ok + fallidos) / total) * 100) : 0;

  if (!montado) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={subiendo ? undefined : onCerrar} />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Subir documentos</h3>
            <p className="text-sm text-slate-500">Área: {area.nombre}</p>
          </div>
          <button
            onClick={onCerrar}
            disabled={subiendo}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Zona de arrastre */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={alSoltar}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-7 text-center transition ${
              dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"
            }`}
          >
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                agregar(Array.from(e.target.files ?? []).map((f) => ({ file: f, ruta: f.name })));
                e.target.value = "";
              }}
            />
            <UploadCloud size={34} className={`mb-2 ${dragOver ? "text-brand-600" : "text-slate-400"}`} />
            <p className="text-sm font-medium text-slate-600">
              Arrastra aquí <span className="text-brand-700">varios archivos o una carpeta completa</span>
            </p>
            <p className="text-xs text-slate-400">o haz clic para seleccionar varios (PDF, Word, Excel, PowerPoint, ZIP, imágenes…)</p>
          </label>

          {/* Seleccionar carpeta */}
          <div className="-mt-2 flex justify-center">
            <input
              ref={inputCarpeta}
              type="file"
              className="hidden"
              // @ts-expect-error atributos no estándar para elegir carpetas
              webkitdirectory="" directory="" mozdirectory=""
              onChange={(e) => {
                const fs = Array.from(e.target.files ?? []).filter((f) => !IGNORAR.test(f.name));
                agregar(fs.map((f) => ({ file: f, ruta: (f as any).webkitRelativePath || f.name })));
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputCarpeta.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <FolderUp size={14} /> Seleccionar una carpeta completa
            </button>
          </div>

          {/* Lista de archivos */}
          {total > 0 && (
            <div className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2">
                <span className="text-xs font-semibold text-slate-600">
                  {total} archivo{total !== 1 ? "s" : ""} en la lista
                  {ok > 0 && <span className="ml-2 font-normal text-estado-vigente">· {ok} subido{ok !== 1 ? "s" : ""}</span>}
                  {fallidos > 0 && <span className="ml-2 font-normal text-estado-obsoleto">· {fallidos} con error</span>}
                </span>
                {!subiendo && (
                  <button
                    onClick={() => { setItems([]); setTerminado(false); setError(""); }}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    Limpiar lista
                  </button>
                )}
              </div>

              {/* Barra de progreso */}
              {(subiendo || terminado) && (
                <div className="border-b border-slate-100 px-3.5 py-2.5">
                  <div className="mb-1 flex items-center justify-between text-2xs text-slate-500">
                    <span>{subiendo ? `Subiendo… ${ok + fallidos} de ${total}` : "Proceso terminado"}</span>
                    <span className="font-medium tabular-nums">{progreso}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${progreso}%` }} />
                  </div>
                </div>
              )}

              <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-3.5 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                      {i.estado === "subiendo" && <Loader2 size={15} className="animate-spin text-brand-600" />}
                      {i.estado === "ok" && <CheckCircle2 size={15} className="text-estado-vigente" />}
                      {i.estado === "error" && <AlertCircle size={15} className="text-estado-obsoleto" />}
                      {i.estado === "pendiente" && <FileText size={15} className="text-slate-300" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-slate-700">{i.ruta}</span>
                      <span className="block text-2xs text-slate-400">
                        {formatoTamano(i.file.size)}
                        {i.error && <span className="text-estado-obsoleto"> · {i.error}</span>}
                      </span>
                    </span>
                    {!subiendo && i.estado !== "ok" && (
                      <button
                        onClick={() => setItems((prev) => prev.filter((x) => x.id !== i.id))}
                        className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-estado-obsoleto"
                        title="Quitar de la lista"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ajustes aplicados a TODOS */}
          <div>
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-slate-400">
              Se aplica a todos los archivos de la lista
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Categoría">
                <select value={categoria} onChange={(e) => setCategoria(e.target.value as any)} className="select" disabled={subiendo}>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo label="Sub-área">
                <select value={subarea} onChange={(e) => setSubarea(e.target.value)} className="select" disabled={subiendo}>
                  {area.subareas.map((sa) => <option key={sa.slug} value={sa.slug}>{sa.nombre}</option>)}
                </select>
              </Campo>
            </div>
          </div>

          <Campo label="Nivel de confidencialidad">
            <select value={confidencialidad} onChange={(e) => setConfidencialidad(e.target.value as any)} className="select" disabled={subiendo}>
              <option value="publico">Público — toda el área</option>
              <option value="jefes">Solo jefes</option>
              <option value="restringido">Restringido — solo gerencia</option>
            </select>
          </Campo>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={soloVista}
              disabled={subiendo}
              onChange={(e) => setSoloVista(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-700"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-700">Solo vista previa (sin descarga)</span>
              <span className="mt-0.5 block text-xs text-slate-500">Los usuarios podrán verlos dentro de la intranet pero no descargarlos.</span>
            </span>
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {terminado && (
            <p className={`rounded-lg px-3 py-2 text-sm ${fallidos ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {fallidos === 0
                ? `Listo: se subieron los ${ok} archivos correctamente.`
                : `Se subieron ${ok} de ${total}. ${fallidos} no se pudieron subir (revisa el detalle arriba).`}
            </p>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <span className="text-xs text-slate-500">
            {subiendo
              ? `${enCurso} subiendo · ${pendientes} en espera`
              : pendientes > 0
                ? `${pendientes} archivo${pendientes !== 1 ? "s" : ""} por subir`
                : "Arrastra archivos o una carpeta"}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              disabled={subiendo}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            >
              {terminado ? "Cerrar" : "Cancelar"}
            </button>
            <button
              onClick={subirTodo}
              disabled={subiendo || pendientes === 0}
              className="flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {subiendo ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {subiendo ? "Subiendo…" : pendientes > 1 ? `Subir ${pendientes} archivos` : "Subir"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .select {
          height: 2.5rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: rgb(51 65 85);
          outline: none;
        }
        .select:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px #dbeafe; }
        .select:disabled { background: rgb(248 250 252); color: rgb(148 163 184); }
      `}</style>
    </div>,
    document.body,
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
