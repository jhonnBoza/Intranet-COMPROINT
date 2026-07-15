"use client";

import { useState } from "react";
import { UploadCloud, X, File as FileIco, Loader2 } from "lucide-react";
import type { Area, Documento } from "@/types";
import { MAX_ARCHIVO_BYTES } from "@/lib/validation";

interface Props {
  area: Area;
  onCerrar: () => void;
  onCreado: (doc: Documento) => void;
}

const CATEGORIAS = ["Procedimiento", "Formato", "Manual", "Registro", "Plano", "Reporte"] as const;

export function UploadModal({ area, onCerrar, onCreado }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Procedimiento");
  const [subarea, setSubarea] = useState(area.subareas[0]?.slug ?? "");
  const [confidencialidad, setConfidencialidad] = useState<Documento["confidencialidad"]>("publico");
  const [soloVista, setSoloVista] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function tomarArchivo(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX_ARCHIVO_BYTES) {
      setError(`El archivo supera el límite de ${(MAX_ARCHIVO_BYTES / 1024 / 1024).toFixed(0)} MB.`);
      return;
    }
    setError("");
    setArchivo(f);
  }

  function leerBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string; // data:...;base64,XXXX
        resolve(res.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function guardar() {
    if (!archivo) {
      setError("Selecciona o arrastra un archivo.");
      return;
    }
    setError("");
    setGuardando(true);
    const tamano = `${(archivo.size / 1024 / 1024).toFixed(1)} MB`;
    const contenidoBase64 = await leerBase64(archivo);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: archivo.name,
        categoria,
        areaSlug: area.slug,
        subareaSlug: subarea,
        confidencialidad,
        tamano,
        soloVista,
        contenidoBase64,
        mime: archivo.type || "application/octet-stream",
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar.");
      return;
    }
    onCreado(data.documento);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCerrar} />

      {/* Modal */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Subir documento</h3>
            <p className="text-sm text-slate-500">Área: {area.nombre}</p>
          </div>
          <button onClick={onCerrar} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Drag & drop */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              tomarArchivo(e.dataTransfer.files[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
              dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"
            }`}
          >
            <input
              type="file"
              className="hidden"
              onChange={(e) => tomarArchivo(e.target.files?.[0])}
            />
            {archivo ? (
              <div className="flex items-center gap-3">
                <FileIco size={28} className="text-brand-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-700">{archivo.name}</p>
                  <p className="text-xs text-slate-400">{(archivo.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
            ) : (
              <>
                <UploadCloud size={36} className="mb-2 text-slate-400" />
                <p className="text-sm font-medium text-slate-600">
                  Arrastra y suelta el archivo aquí
                </p>
                <p className="text-xs text-slate-400">o haz clic para seleccionar (PDF, Word, Excel, PowerPoint, ZIP, imágenes…)</p>
              </>
            )}
          </label>

          {/* Selectores */}
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Categoría">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value as any)} className="select">
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>

            <Campo label="Sub-área">
              <select value={subarea} onChange={(e) => setSubarea(e.target.value)} className="select">
                {area.subareas.map((sa) => <option key={sa.slug} value={sa.slug}>{sa.nombre}</option>)}
              </select>
            </Campo>
          </div>

          <Campo label="Nivel de confidencialidad">
            <select value={confidencialidad} onChange={(e) => setConfidencialidad(e.target.value as any)} className="select">
              <option value="publico">Público — toda el área</option>
              <option value="jefes">Solo jefes</option>
              <option value="restringido">Restringido — solo gerencia</option>
            </select>
          </Campo>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={soloVista}
              onChange={(e) => setSoloVista(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-700"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-700">Solo vista previa (sin descarga)</span>
              <span className="mt-0.5 block text-xs text-slate-500">Los usuarios podrán verlo dentro de la intranet pero no descargarlo.</span>
            </span>
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button onClick={onCerrar} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            Guardar
          </button>
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
        .select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px #dbeafe;
        }
      `}</style>
    </div>
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
