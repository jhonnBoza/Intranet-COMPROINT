"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  LifeBuoy, X, ChevronDown, UploadCloud, Eye, History, Search,
  ClipboardCheck, CalendarClock, Trash2, ShieldCheck,
} from "lucide-react";

interface Pregunta {
  icono: typeof UploadCloud;
  titulo: string;
  respuesta: string;
}

const PREGUNTAS: Pregunta[] = [
  {
    icono: UploadCloud,
    titulo: "¿Cómo subo un documento?",
    respuesta:
      "Entra al área correspondiente y pulsa “Subir documento”. Puedes arrastrar uno o varios archivos, o incluso una carpeta completa. El documento queda “En revisión” hasta que tu jefe de área lo apruebe.",
  },
  {
    icono: Eye,
    titulo: "¿Cómo veo un documento sin descargarlo?",
    respuesta:
      "Haz clic en el ícono del ojo (Vista previa) en la fila del documento. Se abre dentro de la misma página — funciona con PDF, Word, Excel, PowerPoint, ZIP e imágenes, sin necesidad de descargar nada.",
  },
  {
    icono: ClipboardCheck,
    titulo: "¿Qué significan los estados de un documento?",
    respuesta:
      "Vigente: aprobado y en uso. En revisión: recién subido, esperando aprobación del jefe de área. Obsoleto: ya no debe usarse, se conserva solo como referencia.",
  },
  {
    icono: ShieldCheck,
    titulo: "¿Qué significa la confidencialidad de un documento?",
    respuesta:
      "Público: lo ve todo el área. Solo jefes: únicamente jefes de área y gerencia. Restringido: solo la Gerencia General.",
  },
  {
    icono: History,
    titulo: "¿Puedo ver versiones anteriores de un documento?",
    respuesta:
      "Sí. Ábrelo con el ícono de lápiz (Editar) y en “Historial de versiones” verás todas las versiones anteriores con su fecha, autor y tamaño.",
  },
  {
    icono: CalendarClock,
    titulo: "¿Qué es la fecha de próxima revisión?",
    respuesta:
      "Algunos documentos se revisan cada cierto tiempo (por ejemplo, cada año). Cuando falta poco o ya pasó la fecha, aparece un aviso de color en el documento y en el menú “Vencimientos”.",
  },
  {
    icono: Search,
    titulo: "¿Cómo busco un documento?",
    respuesta:
      "Usa el buscador en la parte superior — encuentra por nombre, código o autor, respetando siempre lo que tienes permiso de ver. También puedes filtrar por categoría, carpeta o estado dentro de cada área.",
  },
  {
    icono: Trash2,
    titulo: "Eliminé un documento por error, ¿se puede recuperar?",
    respuesta:
      "Sí. Al eliminar, el documento va a la Papelera (visible para Gerencia), no se borra de inmediato. Desde ahí se puede restaurar. Solo el borrado definitivo desde la papelera es irreversible.",
  },
];

export function HelpPanel() {
  const [montado, setMontado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [expandida, setExpandida] = useState<number | null>(0);

  useEffect(() => setMontado(true), []);
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto]);

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="hidden h-9 w-9 items-center justify-center rounded-md text-brand-100 hover:bg-white/10 hover:text-white sm:flex"
        aria-label="Ayuda"
      >
        <LifeBuoy size={18} />
      </button>

      {montado && abierto && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Ayuda">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <LifeBuoy size={18} className="text-brand-700" />
                <h3 className="text-base font-semibold text-slate-800">Ayuda</h3>
              </div>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
                <X size={19} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {PREGUNTAS.map((p, i) => {
                const Icono = p.icono;
                const abiertaEsta = expandida === i;
                return (
                  <div key={p.titulo} className="border-b border-slate-100 last:border-0">
                    <button
                      onClick={() => setExpandida(abiertaEsta ? null : i)}
                      className="flex w-full items-center gap-3 px-2 py-3 text-left"
                    >
                      <Icono size={17} className="shrink-0 text-brand-700" />
                      <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{p.titulo}</span>
                      <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${abiertaEsta ? "rotate-180" : ""}`} />
                    </button>
                    {abiertaEsta && (
                      <p className="px-2 pb-3.5 pl-[2.1rem] text-sm leading-relaxed text-slate-500">{p.respuesta}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-center text-xs text-slate-500">
              ¿Sigues con dudas? Escribe a{" "}
              <a href="mailto:soporte.ti@comproint.com" className="font-medium text-brand-700 hover:underline">
                soporte.ti@comproint.com
              </a>{" "}
              (anexo 100).
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
