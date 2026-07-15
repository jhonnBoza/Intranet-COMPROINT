"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, FileQuestion } from "lucide-react";
import type { Documento } from "@/types";
import { FileIcon } from "./FileIcon";
import { PdfViewer } from "./PdfViewer";
import { OfficeViewer } from "./OfficeViewer";
import { PptxViewer } from "./PptxViewer";
import { ZipViewer } from "./ZipViewer";

export function FilePreviewModal({ doc, onCerrar }: { doc: Documento; onCerrar: () => void }) {
  const [mounted, setMounted] = useState(false);
  const src = `/api/documents/${doc.id}?ver=1`;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  let contenido: React.ReactNode;
  if (doc.tipo === "pdf") {
    contenido = <PdfViewer src={src} />;
  } else if (doc.tipo === "img") {
    contenido = (
      <div className="flex h-full items-center justify-center overflow-auto bg-slate-200 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={doc.nombre} className="max-h-full max-w-full object-contain shadow" />
      </div>
    );
  } else if (doc.tipo === "docx") {
    contenido = <OfficeViewer src={src} kind="word" />;
  } else if (doc.tipo === "xlsx") {
    contenido = <OfficeViewer src={src} kind="excel" />;
  } else if (doc.tipo === "pptx") {
    contenido = <PptxViewer src={src} />;
  } else if (doc.tipo === "zip") {
    contenido = <ZipViewer src={src} nombre={doc.nombre} />;
  } else {
    contenido = (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-100 px-6 text-center">
        <FileQuestion size={46} className="text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No hay vista previa para este tipo de archivo</p>
        <p className="max-w-sm text-xs text-slate-400">
          Los planos CAD (.dwg) no se pueden previsualizar en el navegador.
          {!doc.soloVista && " Descárgalo para abrirlo."}
        </p>
        {!doc.soloVista && (
          <a href={`/api/documents/${doc.id}`} className="btn-primary mt-2"><Download size={16} /> Descargar archivo</a>
        )}
      </div>
    );
  }

  const modal = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      {/* Fondo — cubre TODA la pantalla */}
      <div className="absolute inset-0 bg-ink-950/75" onClick={onCerrar} />

      {/* Tarjeta flotante */}
      <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
          <FileIcon tipo={doc.tipo} size={18} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{doc.nombre}</p>
            <p className="text-2xs text-slate-400">Vista previa · v{doc.version} · {doc.tamano}</p>
          </div>
          {doc.soloVista ? (
            <span className="rounded-md bg-amber-50 px-2.5 py-1 text-2xs font-medium text-estado-revision">Solo vista previa</span>
          ) : (
            <a
              href={`/api/documents/${doc.id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={14} /> Descargar
            </a>
          )}
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 flex-1">{contenido}</div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
