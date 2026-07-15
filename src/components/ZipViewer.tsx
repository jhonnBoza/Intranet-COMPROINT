"use client";

import { useEffect, useState } from "react";
import { Loader2, FileWarning, Folder, File as FileIco, FileArchive } from "lucide-react";

interface Entrada { nombre: string; carpeta: boolean; tamano: number }

function formatoBytes(n: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Muestra el contenido de un .zip (lista de archivos) sin descargarlo.
export function ZipViewer({ src, nombre }: { src: string; nombre: string }) {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error("fetch");
        const buf = await res.arrayBuffer();
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(buf);
        const list: Entrada[] = Object.values(zip.files).map((f: any) => ({
          nombre: f.name,
          carpeta: f.dir,
          tamano: f._data?.uncompressedSize ?? 0,
        }));
        list.sort((a, b) => a.nombre.localeCompare(b.nombre));
        if (!cancel) { setEntradas(list); setCargando(false); }
      } catch {
        if (!cancel) { setError("No se pudo leer el contenido (¿es .rar o .7z? solo se puede ver dentro de .zip)."); setCargando(false); }
      }
    })();
    return () => { cancel = true; };
  }, [src]);

  if (cargando) {
    return <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400"><Loader2 size={26} className="animate-spin" /></div>;
  }
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-100 px-6 text-center text-slate-500">
        <FileWarning size={40} className="text-slate-300" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const archivos = entradas.filter((e) => !e.carpeta);

  return (
    <div className="h-full overflow-auto bg-slate-100 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
          <FileArchive size={18} className="text-gold-600" />
          <span className="font-medium">{nombre}</span>
          <span className="text-slate-400">· {archivos.length} archivo{archivos.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {entradas.map((e, i) => (
            <div key={e.nombre} className={`flex items-center gap-2.5 px-4 py-2 text-sm ${i > 0 ? "border-t border-slate-100" : ""}`}>
              {e.carpeta ? <Folder size={16} className="text-gold-500" /> : <FileIco size={16} className="text-slate-400" />}
              <span className="min-w-0 flex-1 truncate text-slate-700">{e.nombre}</span>
              {!e.carpeta && <span className="tabular text-xs text-slate-400">{formatoBytes(e.tamano)}</span>}
            </div>
          ))}
          {entradas.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">El archivo ZIP está vacío.</p>}
        </div>
      </div>
    </div>
  );
}
