"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, FileWarning } from "lucide-react";

// Visor de PDF con PDF.js — renderiza a canvas (funciona en todos los navegadores).
export function PdfViewer({ src }: { src: string }) {
  const contRef = useRef<HTMLDivElement>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        // Import dinámico (solo en el cliente, evita errores de SSR).
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjs.getDocument({ url: src, withCredentials: true }).promise;
        if (cancelado) return;

        const cont = contRef.current;
        if (!cont) return;
        cont.innerHTML = "";

        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          if (cancelado) return;
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "mx-auto mb-4 w-full max-w-3xl rounded bg-white shadow";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          cont.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        }
        if (!cancelado) setCargando(false);
      } catch {
        if (!cancelado) { setError("No se pudo cargar la vista previa del PDF."); setCargando(false); }
      }
    })();

    return () => { cancelado = true; };
  }, [src]);

  return (
    <div className="h-full overflow-auto bg-slate-200 p-5">
      {cargando && (
        <div className="flex h-full items-center justify-center text-slate-400">
          <Loader2 size={26} className="animate-spin" />
        </div>
      )}
      {error && (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
          <FileWarning size={40} className="text-slate-300" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      <div ref={contRef} />
    </div>
  );
}
