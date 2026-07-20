"use client";

import { useState } from "react";
import { Megaphone, Plus, X, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import type { Anuncio } from "@/types";
import { formatoFecha } from "@/lib/format";
import { useConfirm, useToast } from "./Feedback";

export function AnnouncementsPanel({
  anunciosIniciales,
  puedePublicar,
  puedeEliminar,
}: {
  anunciosIniciales: Anuncio[];
  puedePublicar: boolean;
  puedeEliminar?: boolean;
}) {
  const [anuncios, setAnuncios] = useState(anunciosIniciales);
  const [modal, setModal] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  function onCreado(a: Anuncio) {
    setAnuncios((prev) => [a, ...prev]);
    setModal(false);
  }

  async function eliminar(a: Anuncio) {
    const ok = await confirm({
      titulo: "Eliminar anuncio",
      mensaje: `“${a.titulo}” dejará de mostrarse a todos. Esta acción no se puede deshacer.`,
      confirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/announcements/${a.id}`, { method: "DELETE" });
    if (res.ok) { setAnuncios((prev) => prev.filter((x) => x.id !== a.id)); toast("Anuncio eliminado."); }
    else { const d = await res.json().catch(() => ({})); toast(d.error ?? "No se pudo eliminar.", "error"); }
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Megaphone size={14} /> Anuncios corporativos
        </h2>
        {puedePublicar && (
          <button
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            <Plus size={13} /> Nuevo
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {anuncios.map((a, i) => (
          <article
            key={a.id}
            className={`relative p-3.5 ${i > 0 ? "border-t border-slate-100" : ""} ${i === 0 ? "pl-4" : ""}`}
          >
            {i === 0 && <span className="absolute inset-y-0 left-0 w-0.5 bg-gold-400" />}
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[13px] font-medium text-slate-800">{a.titulo}</p>
              {a.prioridad === "alta" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-2xs font-medium text-estado-revision">
                  <AlertTriangle size={10} /> Alta
                </span>
              )}
              {puedeEliminar && (
                <button
                  onClick={() => eliminar(a)}
                  aria-label="Eliminar anuncio"
                  className="shrink-0 rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-estado-obsoleto"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.cuerpo}</p>
            <p className="mt-2 text-2xs uppercase tracking-wide text-slate-400">
              {a.autor} · {formatoFecha(a.fecha)}
            </p>
          </article>
        ))}
      </div>

      {modal && <ModalAnuncio onCerrar={() => setModal(false)} onCreado={onCreado} />}
    </section>
  );
}

function ModalAnuncio({
  onCerrar,
  onCreado,
}: {
  onCerrar: () => void;
  onCreado: (a: Anuncio) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [prioridad, setPrioridad] = useState<"normal" | "alta">("normal");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function publicar() {
    if (!titulo.trim() || !cuerpo.trim()) {
      setError("Completa el título y el contenido.");
      return;
    }
    setError("");
    setGuardando(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, cuerpo, prioridad }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo publicar.");
      return;
    }
    onCreado(data.anuncio);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onCerrar} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-brand-700" />
            <h3 className="text-base font-semibold text-slate-800">Publicar anuncio</h3>
          </div>
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Título</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Actualización del procedimiento de soldadura"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Contenido</label>
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={4}
              placeholder="Detalle del anuncio para toda la organización…"
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Prioridad</label>
            <div className="flex gap-2">
              <PrioridadBtn activo={prioridad === "normal"} onClick={() => setPrioridad("normal")} label="Normal" />
              <PrioridadBtn activo={prioridad === "alta"} onClick={() => setPrioridad("alta")} label="Alta / Urgente" />
            </div>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-estado-obsoleto">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button onClick={onCerrar} className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
            Cancelar
          </button>
          <button onClick={publicar} disabled={guardando} className="btn-primary">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}

function PrioridadBtn({ activo, onClick, label }: { activo: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
        activo ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
