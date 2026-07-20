"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X, Loader2, History, Upload, Download } from "lucide-react";
import type { Documento } from "@/types";
import { formatoFecha } from "@/lib/format";
import { MAX_ARCHIVO_BYTES } from "@/lib/validation";
import { PERIODOS_REVISION, sumarMeses } from "@/lib/vigencia";
import { ModalPortal } from "./ModalPortal";

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
const CATEGORIAS = ["Procedimiento", "Formato", "Manual", "Registro", "Plano", "Reporte"];

interface Version { id: string; version: string; tamano: string; autor: string; fecha: string }
interface SubArea { slug: string; nombre: string }
interface Proyecto { slug: string; nombre: string }

export function EditDocModal({
  doc: docInicial, subareas, onCerrar, onEditado,
}: {
  doc: Documento;
  subareas?: SubArea[];
  onCerrar: () => void;
  onEditado: (d: Documento) => void;
}) {
  const [doc, setDoc] = useState(docInicial);
  const [nombre, setNombre] = useState(docInicial.nombre);
  const [estado, setEstado] = useState(docInicial.estado);
  const [confidencialidad, setConfidencialidad] = useState(docInicial.confidencialidad);
  const [categoria, setCategoria] = useState<string>(docInicial.categoria);
  const [subarea, setSubarea] = useState<string>(docInicial.subareaSlug ?? "");
  const [proyecto, setProyecto] = useState<string>(docInicial.proyectoSlug ?? "");
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [fechaAprobacion, setFechaAprobacion] = useState<string>(docInicial.fechaAprobacion ?? "");
  const [periodoRevision, setPeriodoRevision] = useState<number>(docInicial.periodoRevisionMeses ?? 0);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [subiendoVer, setSubiendoVer] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/documents/${doc.id}/versions`).then((r) => r.json())
      .then((d) => setVersiones(d.versiones ?? [])).catch(() => {});
    fetch(`/api/projects`).then((r) => r.json())
      .then((d) => setProyectos(d.proyectos ?? [])).catch(() => {});
  }, [doc.id]);

  // Cerrar con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !guardando && !subiendoVer) onCerrar(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar, guardando, subiendoVer]);

  async function guardar() {
    setError("");
    setGuardando(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          estado,
          confidencialidad,
          categoria,
          subareaSlug: subarea || "",
          proyectoSlug: proyecto || "",
          fechaAprobacion: fechaAprobacion || "",
          periodoRevisionMeses: periodoRevision,
        }),
      });
      if (res.status === 401) { setError("Tu sesión caducó. Vuelve a iniciar sesión."); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "No se pudo guardar."); return; }
      onEditado(data.documento);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function subirNuevaVersion(f: File) {
    setError("");
    if (f.size > MAX_ARCHIVO_BYTES) {
      setError(`El archivo supera el límite de ${(MAX_ARCHIVO_BYTES / 1024 / 1024).toFixed(0)} MB.`);
      return;
    }
    setSubiendoVer(true);
    try {
      // Subida directa a Storage (sin el límite de ~4.5 MB de Vercel).
      const urlRes = await fetch("/api/documents/upload-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaSlug: doc.areaSlug }),
      });
      if (urlRes.status === 401) { setError("Tu sesión caducó. Vuelve a iniciar sesión."); return; }
      const urlData = await urlRes.json().catch(() => ({}));
      if (!urlRes.ok) { setError(urlData.error ?? "No se pudo preparar la subida."); return; }

      const put = await fetch(urlData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!put.ok) { setError("Falló la subida del archivo. Reintenta."); return; }

      const tamano = f.size < 1024 * 1024 ? `${Math.round(f.size / 1024)} KB` : `${(f.size / 1024 / 1024).toFixed(1)} MB`;
      const res = await fetch(`/api/documents/${doc.id}/versions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: urlData.path, mime: f.type || "application/octet-stream", tamano }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "No se pudo subir la versión."); return; }
      setDoc(data.documento);
      onEditado(data.documento);
      const v = await fetch(`/api/documents/${doc.id}/versions`).then((r) => r.json()).catch(() => ({}));
      setVersiones(v.versiones ?? []);
    } catch {
      setError("Error de conexión al subir la versión.");
    } finally {
      setSubiendoVer(false);
    }
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={guardando ? undefined : onCerrar} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Pencil size={17} className="text-slate-500" />
            <h3 className="text-base font-semibold text-slate-800">Editar documento</h3>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Nombre del archivo</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {doc.codigo && <span className="rounded bg-brand-50 px-2 py-0.5 text-2xs font-semibold tabular text-brand-700">{doc.codigo}</span>}
                <span className="rounded bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-600">v{doc.version}</span>
              </span>
            </label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="field-select w-full" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as any)} className="field-select w-full">
                {ESTADOS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="field-select w-full">
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {subareas && subareas.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Carpeta (sub-área)</label>
                <select value={subarea} onChange={(e) => setSubarea(e.target.value)} className="field-select w-full">
                  <option value="">— Sin carpeta —</option>
                  {subareas.map((s) => <option key={s.slug} value={s.slug}>{s.nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Proyecto</label>
              <select value={proyecto} onChange={(e) => setProyecto(e.target.value)} className="field-select w-full">
                <option value="">— Sin proyecto —</option>
                {proyectos.map((p) => <option key={p.slug} value={p.slug}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Confidencialidad</label>
            <select value={confidencialidad} onChange={(e) => setConfidencialidad(e.target.value as any)} className="field-select w-full">
              {CONF.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>

          {/* Control de vigencia (ISO) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha de aprobación</label>
              <input type="date" value={fechaAprobacion} onChange={(e) => setFechaAprobacion(e.target.value)} className="field-select w-full" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Revisión periódica</label>
              <select value={periodoRevision} onChange={(e) => setPeriodoRevision(Number(e.target.value))} className="field-select w-full">
                {PERIODOS_REVISION.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
          </div>
          {fechaAprobacion && periodoRevision > 0 && (
            <p className="-mt-1 text-2xs text-slate-500">
              Próxima revisión: <b className="text-slate-700">{sumarMeses(fechaAprobacion, periodoRevision)}</b>
            </p>
          )}

          {/* Versiones */}
          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><History size={14} /> Historial de versiones</span>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={subiendoVer}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {subiendoVer ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Nueva versión
              </button>
              <input ref={fileRef} type="file" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) subirNuevaVersion(f); e.target.value = ""; }} />
            </div>
            <div className="max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="font-medium text-slate-700">v{doc.version} · actual</span>
                <span className="text-slate-400">{doc.tamano}</span>
              </div>
              {versiones.map((v) => (
                doc.soloVista ? (
                  <div key={v.id} className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs">
                    <span className="text-slate-600">v{v.version} · {v.autor} · {formatoFecha(v.fecha)}</span>
                    <span className="text-slate-400">{v.tamano}</span>
                  </div>
                ) : (
                  <a key={v.id} href={`/api/documents/${doc.id}/versions?dl=${v.id}`}
                    className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs hover:bg-slate-50">
                    <span className="text-slate-600">v{v.version} · {v.autor} · {formatoFecha(v.fecha)}</span>
                    <span className="flex items-center gap-1 text-slate-400"><Download size={12} /> {v.tamano}</span>
                  </a>
                )
              ))}
              {versiones.length === 0 && (
                <p className="border-t border-slate-100 px-3 py-2 text-2xs text-slate-400">Sin versiones anteriores. Al subir una nueva versión, la actual se archiva aquí.</p>
              )}
            </div>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-estado-obsoleto">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button onClick={onCerrar} className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">Cerrar</button>
          <button onClick={guardar} disabled={guardando} className="btn-primary">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
