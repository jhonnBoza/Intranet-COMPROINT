"use client";

import { useEffect, useState } from "react";
import { Loader2, FileWarning } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

interface Hoja { name: string; html: string }

// Renderiza Word (.docx) y Excel (.xlsx) en el navegador, sin servicios externos.
export function OfficeViewer({ src, kind }: { src: string; kind: "word" | "excel" }) {
  const [html, setHtml] = useState("");
  const [hojas, setHojas] = useState<Hoja[]>([]);
  const [activa, setActiva] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error("fetch");
        const buf = await res.arrayBuffer();

        if (kind === "word") {
          const mammoth: any = await import("mammoth");
          const out = await mammoth.convertToHtml({ arrayBuffer: buf });
          // El .docx es contenido no confiable: sanitizamos antes de inyectarlo.
          const limpio = DOMPurify.sanitize(out.value || "<p>(documento vacío)</p>");
          if (!cancel) { setHtml(limpio); setCargando(false); }
        } else {
          const XLSX: any = await import("xlsx");
          const wb = XLSX.read(buf, { type: "array" });
          const hs: Hoja[] = wb.SheetNames.map((name: string) => ({
            name,
            html: DOMPurify.sanitize(XLSX.utils.sheet_to_html(wb.Sheets[name], { editable: false })),
          }));
          if (!cancel) { setHojas(hs); setCargando(false); }
        }
      } catch {
        if (!cancel) { setError("No se pudo generar la vista previa de este archivo."); setCargando(false); }
      }
    })();
    return () => { cancel = true; };
  }, [src, kind]);

  if (cargando) {
    return <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400"><Loader2 size={26} className="animate-spin" /></div>;
  }
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500">
        <FileWarning size={40} className="text-slate-300" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (kind === "word") {
    return (
      <div className="office-scroll h-full overflow-auto bg-slate-200 p-6">
        <div className="doc-word mx-auto max-w-3xl rounded bg-white p-10 shadow" dangerouslySetInnerHTML={{ __html: html }} />
        <EstilosOffice />
      </div>
    );
  }

  // Excel
  return (
    <div className="flex h-full flex-col bg-slate-200">
      {hojas.length > 1 && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-300 bg-slate-100 px-3 py-1.5">
          {hojas.map((h, i) => (
            <button
              key={h.name}
              onClick={() => setActiva(i)}
              className={`shrink-0 rounded px-3 py-1 text-xs font-medium ${i === activa ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:bg-white/60"}`}
            >
              {h.name}
            </button>
          ))}
        </div>
      )}
      <div className="doc-excel min-h-0 flex-1 overflow-auto p-4">
        <div dangerouslySetInnerHTML={{ __html: hojas[activa]?.html ?? "" }} />
      </div>
      <EstilosOffice />
    </div>
  );
}

function EstilosOffice() {
  return (
    <style jsx global>{`
      .doc-word { color: #1e293b; font-size: 14px; line-height: 1.7; }
      .doc-word h1 { font-size: 1.6em; font-weight: 700; margin: 0.6em 0 0.3em; }
      .doc-word h2 { font-size: 1.3em; font-weight: 700; margin: 0.6em 0 0.3em; }
      .doc-word h3 { font-size: 1.1em; font-weight: 600; margin: 0.6em 0 0.3em; }
      .doc-word p { margin: 0.5em 0; }
      .doc-word ul, .doc-word ol { margin: 0.5em 0; padding-left: 1.5em; }
      .doc-word table { border-collapse: collapse; margin: 0.8em 0; width: 100%; }
      .doc-word td, .doc-word th { border: 1px solid #cbd5e1; padding: 4px 8px; }
      .doc-word img { max-width: 100%; height: auto; }
      .doc-word a { color: #235684; text-decoration: underline; }

      .doc-excel table { border-collapse: collapse; background: #fff; font-size: 13px; }
      .doc-excel td, .doc-excel th { border: 1px solid #d4d9e0; padding: 4px 10px; white-space: nowrap; color: #1e293b; }
      .doc-excel tr:first-child td { background: #f1f5f9; font-weight: 600; }
    `}</style>
  );
}
