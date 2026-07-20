"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, FileWarning } from "lucide-react";

// Visor de PowerPoint (.pptx) — renderiza las diapositivas en el navegador.
export function PptxViewer({ src }: { src: string }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    let previewer: { destroy?: () => void } | null = null;
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(src, { signal: ac.signal });
        if (!res.ok) throw new Error("fetch");
        const buf = await res.arrayBuffer();

        const { init } = await import("pptx-preview");
        if (cancel || !holderRef.current) return;

        const ancho = Math.min((holderRef.current.clientWidth || 900) - 24, 960);
        previewer = init(holderRef.current, {
          width: ancho,
          height: Math.round((ancho * 9) / 16),
          mode: "list",
        });
        await (previewer as any).preview(buf);
        if (!cancel) setCargando(false);
      } catch (e) {
        if (!cancel && (e as any)?.name !== "AbortError") {
          setError("No se pudo generar la vista previa de esta presentación."); setCargando(false);
        }
      }
    })();

    return () => {
      cancel = true;
      ac.abort();
      try { previewer?.destroy?.(); } catch { /* noop */ }
    };
  }, [src]);

  return (
    <div className="relative h-full overflow-auto bg-slate-200 p-4">
      {cargando && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          <Loader2 size={26} className="animate-spin" />
        </div>
      )}
      {error && (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
          <FileWarning size={40} className="text-slate-300" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      <div ref={holderRef} className="mx-auto flex flex-col items-center gap-4" />
    </div>
  );
}
