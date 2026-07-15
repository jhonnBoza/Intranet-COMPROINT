"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X, Loader2, History, Upload, Download } from "lucide-react";
import type { Documento } from "@/types";
import { formatoFecha } from "@/lib/format";
import { MAX_ARCHIVO_BYTES } from "@/lib/validation";

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

interface Version { id: string; version: string; tamano: string; autor: string; fecha: string }

function leerBase64(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

export function EditDocModal({
  doc: docInicial, onCerrar, onEditado,
}: { doc: Documento; onCerrar: () => void; onEditado: (d: Documento) => void }) {
  const [doc, setDoc] = useState(docInicial);
  const [estado, setEstado] = useState(docInicial.estado);
  const [confidencialidad, setConfidencialidad] = useState(docInicial.confidencialidad);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [subiendoVer, setSubiendoVer] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/documents/${doc.id}/versions`)
      .then((r) => r.json())
      .then((d) => setVersiones(d.versiones ?? []))
      .catch(() => {});
  }, [doc.id]);

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

  async function subirNuevaVersion(f: File) {
    setError("");
    if (f.size > MAX_ARCHIVO_BYTES) {
      setError(`El archivo supera el límite de ${(MAX_ARCHIVO_BYTES / 1024 / 1024).toFixed(0)} MB.`);
      return;
    }
    setSubiendoVer(true);
    const contenidoBase64 = await leerBase64(f);
    const tamano = `${(f.size / 1024 / 1024).toFixed(1)} MB`;
    const res = await fetch(`/api/documents/${doc.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenidoBase64, mime: f.type || "application/octet-stream", tamano }),
    });
    const data = await res.json();
    setSubiendoVer(false);
    if (!res.ok) { setError(data.error ?? "No se pudo subir la versión."); return; }
    setDoc(data.documento);
    onEditado(data.documento);
    const v = await fetch(`/api/documents/${doc.id}/versions`).then((r) => r.json()).catch(() => ({}));
    setVersiones(v.versiones ?? []);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onCerrar} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Pencil size={17} className="text-slate-500" />
            <h3 className="text-base font-semibold text-slate-800">Editar documento</h3>
          </div>
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium text-slate-600">{doc.nombre}</p>
            <span className="shrink-0 rounded bg-brand-50 px-2 py-0.5 text-2xs font-medium text-brand-700">v{doc.version}</span>
          </div>

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
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subirNuevaVersion(f); }} />
            </div>
            <div className="max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="font-medium text-slate-700">v{doc.version} · actual</span>
                <span className="text-slate-400">{doc.tamano}</span>
              </div>
              {versiones.map((v) => (
                <a key={v.id} href={`/api/documents/${doc.id}/versions?dl=${v.id}`}
                  className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs hover:bg-slate-50">
                  <span className="text-slate-600">v{v.version} · {v.autor} · {formatoFecha(v.fecha)}</span>
                  <span className="flex items-center gap-1 text-slate-400"><Download size={12} /> {v.tamano}</span>
                </a>
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
  );
}
