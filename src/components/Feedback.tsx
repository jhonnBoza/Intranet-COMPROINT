"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";

// ============================================================
//  Diálogos de confirmación y avisos (toasts) con la identidad
//  de la app — reemplazan a los alert()/confirm() del navegador.
// ============================================================

interface ConfirmOpts {
  titulo: string;
  mensaje?: string;
  confirmar?: string;
  cancelar?: string;
  peligro?: boolean;
}
type TipoToast = "ok" | "error" | "info";
interface Toast { id: number; tipo: TipoToast; mensaje: string }

interface FeedbackCtx {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  toast: (mensaje: string, tipo?: TipoToast) => void;
}

const Ctx = createContext<FeedbackCtx | null>(null);

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm debe usarse dentro de <FeedbackProvider>");
  return c.confirm;
}
export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast debe usarse dentro de <FeedbackProvider>");
  return c.toast;
}

let contador = 0;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [montado, setMontado] = useState(false);
  const [dialogo, setDialogo] = useState<{ opts: ConfirmOpts; resolver: (b: boolean) => void } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => setMontado(true), []);

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolver) => setDialogo({ opts, resolver }));
  }, []);

  const cerrar = useCallback((valor: boolean) => {
    setDialogo((d) => { d?.resolver(valor); return null; });
  }, []);

  const toast = useCallback((mensaje: string, tipo: TipoToast = "ok") => {
    const id = ++contador;
    setToasts((t) => [...t, { id, tipo, mensaje }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // Escape cierra el diálogo (equivale a cancelar).
  useEffect(() => {
    if (!dialogo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialogo, cerrar]);

  return (
    <Ctx.Provider value={{ confirm, toast }}>
      {children}

      {montado && dialogo && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => cerrar(false)} />
          <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-panel">
            <div className="px-5 pb-4 pt-5">
              <div className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${dialogo.opts.peligro ? "bg-red-50 text-estado-obsoleto" : "bg-brand-50 text-brand-700"}`}>
                  <AlertTriangle size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-800">{dialogo.opts.titulo}</h3>
                  {dialogo.opts.mensaje && <p className="mt-1 text-sm text-slate-500">{dialogo.opts.mensaje}</p>}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
              <button
                onClick={() => cerrar(false)}
                autoFocus
                className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                {dialogo.opts.cancelar ?? "Cancelar"}
              </button>
              <button
                onClick={() => cerrar(true)}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${dialogo.opts.peligro ? "bg-estado-obsoleto hover:brightness-95" : "bg-brand-700 hover:bg-brand-800"}`}
              >
                {dialogo.opts.confirmar ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {montado && toasts.length > 0 && createPortal(
        <div className="fixed bottom-4 right-4 z-[90] flex w-full max-w-xs flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-panel"
            >
              <span className={
                t.tipo === "error" ? "text-estado-obsoleto" : t.tipo === "info" ? "text-brand-700" : "text-estado-vigente"
              }>
                {t.tipo === "error" ? <XCircle size={17} /> : t.tipo === "info" ? <Info size={17} /> : <CheckCircle2 size={17} />}
              </span>
              <p className="min-w-0 flex-1 text-sm text-slate-700">{t.mensaje}</p>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Cerrar aviso"
                className="text-slate-300 hover:text-slate-500"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}
