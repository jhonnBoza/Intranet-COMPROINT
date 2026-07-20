"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, Bell, LogOut, ChevronDown, LifeBuoy } from "lucide-react";
import type { UsuarioPublico, Documento } from "@/types";
import { ETIQUETA_ROL } from "@/lib/permissions";
import { tiempoRelativo } from "@/lib/format";
import { FileIcon } from "./FileIcon";
import { LogoMark } from "./Logo";

interface Notif { id: string; titulo: string; cuerpo: string; url?: string | null; fecha: string; leida: boolean }

export function Header({
  user,
  onToggleSidebar,
}: {
  user: UsuarioPublico;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Documento[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [notis, setNotis] = useState<Notif[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [notiAbierto, setNotiAbierto] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);

  // Trae notificaciones al montar y cada 2 min, pero SOLO con la pestaña visible
  // (no gasta recursos en segundo plano) y se detiene si la sesión expira.
  useEffect(() => {
    let vivo = true;
    let iv: ReturnType<typeof setInterval> | null = null;

    async function cargar() {
      if (document.hidden) return; // pestaña oculta: no consultamos
      const res = await fetch("/api/notifications");
      if (!vivo) return;
      if (res.status === 401) { if (iv) clearInterval(iv); iv = null; return; } // sesión expirada
      if (!res.ok) return;
      const d = await res.json();
      setNotis(d.items ?? []);
      setNoLeidas(d.noLeidas ?? 0);
    }

    function iniciar() {
      if (!iv) iv = setInterval(cargar, 120000);
    }
    // Al volver a la pestaña, refresca una vez y reanuda el intervalo.
    function alVisibilidad() {
      if (!document.hidden) { cargar(); iniciar(); }
    }

    cargar();
    iniciar();
    document.addEventListener("visibilitychange", alVisibilidad);
    return () => {
      vivo = false;
      if (iv) clearInterval(iv);
      document.removeEventListener("visibilitychange", alVisibilidad);
    };
  }, []);

  async function abrirNotis() {
    const abrir = !notiAbierto;
    setNotiAbierto(abrir);
    if (!abrir) return;
    // Recarga fresca ANTES de marcar leídas, para no marcar como vista una
    // notificación recién llegada que aún no aparece en la lista.
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const d = await res.json();
      setNotis(d.items ?? []);
    }
    if (noLeidas > 0) {
      setNoLeidas(0);
      setNotis((prev) => prev.map((n) => ({ ...n, leida: true })));
      await fetch("/api/notifications", { method: "PATCH" });
    }
  }

  async function borrarNotis() {
    setNotis([]);
    setNoLeidas(0);
    await fetch("/api/notifications", { method: "DELETE" });
  }

  useEffect(() => {
    if (!q.trim()) { setResultados([]); setBuscando(false); return; }
    setBuscando(true);
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/documents?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        const data = await res.json();
        setResultados(data.resultados ?? []);
        setBuscando(false);
      } catch (e) {
        if ((e as any)?.name !== "AbortError") setBuscando(false);
      }
    }, 250);
    // Cancela el timeout Y el fetch en vuelo para que no llegue una respuesta vieja.
    return () => { clearTimeout(t); ac.abort(); };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setResultados([]);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false);
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) setNotiAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const iniciales = user.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("");

  return (
    <header className="z-30 flex h-14 items-center gap-3 border-b-2 border-gold-400 bg-brand-800 px-4 lg:px-5">
      <button onClick={onToggleSidebar} className="flex h-9 w-9 items-center justify-center rounded-md text-brand-100 hover:bg-white/10 lg:hidden">
        <Menu size={20} />
      </button>

      <Link href="/dashboard" className="flex items-center gap-2.5 pr-2">
        <LogoMark size={30} />
        <span className="hidden text-[15px] font-semibold tracking-[0.12em] text-white sm:block">COMPROINT</span>
      </Link>

      <div className="hidden h-6 w-px bg-white/15 lg:block" />

      <div ref={boxRef} className="relative w-full max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-200" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          aria-label="Buscar documentos"
          className="h-9 w-full rounded-md border border-white/15 bg-white/10 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-brand-200 focus:border-white/30 focus:bg-white/15"
        />
        {q.trim() && (
          <div className="absolute left-0 right-0 top-11 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
            {buscando && <p className="px-4 py-3 text-sm text-slate-400">Buscando…</p>}
            {!buscando && resultados.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">Sin resultados para “{q}”.</p>
            )}
            {resultados.map((d) => (
              <Link key={d.id} href={`/area/${d.areaSlug}?q=${encodeURIComponent(d.nombre)}`} onClick={() => setQ("")}
                className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-slate-50">
                <FileIcon tipo={d.tipo} size={15} />
                <span className="min-w-0 truncate text-sm text-slate-700">
                  {d.codigo && <span className="mr-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-2xs font-semibold tabular text-brand-700">{d.codigo}</span>}
                  {d.nombre}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        <button className="hidden h-9 w-9 items-center justify-center rounded-md text-brand-100 hover:bg-white/10 hover:text-white sm:flex" aria-label="Mesa de ayuda">
          <LifeBuoy size={18} />
        </button>
        <div ref={notiRef} className="relative">
          <button onClick={abrirNotis} className="relative flex h-9 w-9 items-center justify-center rounded-md text-brand-100 hover:bg-white/10 hover:text-white" aria-label="Notificaciones">
            <Bell size={18} />
            {noLeidas > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-estado-obsoleto px-1 text-[9px] font-bold text-white">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </button>

          {notiAbierto && (
            <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-700 shadow-panel">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <p className="text-sm font-semibold text-slate-800">Notificaciones</p>
                {notis.length > 0 && (
                  <button onClick={borrarNotis} className="text-xs font-medium text-slate-400 hover:text-estado-obsoleto">
                    Borrar todas
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notis.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">No tienes notificaciones.</p>
                )}
                {notis.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { setNotiAbierto(false); if (n.url) router.push(n.url); }}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-4 py-2.5 text-left last:border-0 hover:bg-slate-50"
                  >
                    <span className="text-[13px] font-medium text-slate-800">{n.titulo}</span>
                    <span className="line-clamp-2 text-xs text-slate-500">{n.cuerpo}</span>
                    <span className="text-2xs uppercase tracking-wide text-slate-400">{tiempoRelativo(n.fecha)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mx-1.5 h-6 w-px bg-white/15" />

        <div ref={menuRef} className="relative">
          <button onClick={() => setMenuAbierto((v) => !v)} className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-1.5 hover:bg-white/10">
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-2xs font-semibold text-white ring-1 ring-white/20" style={{ background: user.avatarColor }}>
              {iniciales}
            </span>
            <div className="hidden text-left leading-tight md:block">
              <p className="text-[13px] font-medium text-white">{user.nombre}</p>
              <p className="text-2xs text-brand-200">{user.cargo}</p>
            </div>
            <ChevronDown size={15} className="hidden text-brand-200 md:block" />
          </button>

          {menuAbierto && (
            <div className="absolute right-0 top-11 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">{user.nombre}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
                <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-600">
                  {ETIQUETA_ROL[user.rol]}
                </span>
              </div>
              <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
