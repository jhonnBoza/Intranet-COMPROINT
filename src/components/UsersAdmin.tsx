"use client";

import { useEffect, useState } from "react";
import { Plus, X, Loader2, Pencil, UserCheck, UserX, ChevronRight, Search } from "lucide-react";
import type { UsuarioPublico, Rol } from "@/types";
import { AREAS } from "@/server/data/areas";
import { ETIQUETA_ROL } from "@/lib/permissions";
import { useToast } from "./Feedback";

const ROLES: Rol[] = ["GERENTE_GENERAL", "JEFE_AREA", "SUPERVISOR", "OPERARIO"];
const NOMBRE_AREA: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.slug, a.nombre]));
const PAGE_SIZE = 12;

export function UsersAdmin({
  usuariosIniciales, adminId,
}: { usuariosIniciales: UsuarioPublico[]; adminId: string }) {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [q, setQ] = useState("");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [editando, setEditando] = useState<UsuarioPublico | null>(null);
  const [page, setPage] = useState(1);

  const filtrados = usuarios.filter((u) =>
    `${u.nombre} ${u.email} ${u.cargo}`.toLowerCase().includes(q.toLowerCase()),
  );

  // Reinicia a la primera página cuando cambia la búsqueda.
  useEffect(() => { setPage(1); }, [q]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPaginas);
  const inicio = filtrados.length === 0 ? 0 : (paginaActual - 1) * PAGE_SIZE + 1;
  const fin = Math.min(paginaActual * PAGE_SIZE, filtrados.length);
  const pagina = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  function tras(u: UsuarioPublico) {
    setUsuarios((prev) => {
      const i = prev.findIndex((x) => x.id === u.id);
      if (i === -1) return [...prev, u].sort((a, b) => a.nombre.localeCompare(b.nombre));
      const n = [...prev]; n[i] = u; return n;
    });
    setModalNuevo(false);
    setEditando(null);
  }

  async function toggleActivo(u: UsuarioPublico) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !u.activo }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { tras(data.usuario); toast(data.usuario.activo ? "Usuario activado." : "Usuario desactivado."); }
    else toast(data.error ?? "No se pudo actualizar.", "error");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-400">
            <span>Inicio</span><ChevronRight size={13} /><span className="font-medium text-slate-600">Administración</span>
            <ChevronRight size={13} /><span className="font-medium text-gold-600">Usuarios</span>
          </nav>
          <h1 className="mt-1.5 text-xl font-semibold text-slate-800">Usuarios</h1>
          <p className="mt-0.5 text-sm text-slate-500">Gestiona cuentas, roles y accesos de la organización.</p>
        </div>
        <button onClick={() => setModalNuevo(true)} className="btn-primary shrink-0"><Plus size={17} /> Nuevo usuario</button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, correo o cargo…"
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-2xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Usuario</th>
                <th className="px-4 py-2.5 font-semibold">Rol</th>
                <th className="px-4 py-2.5 font-semibold">Área</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
                <th className="px-4 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((u) => {
                const iniciales = u.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("");
                return (
                  <tr key={u.id} className="group border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50">
                    <td className="border-l-2 border-l-transparent px-4 py-3 transition-colors group-hover:border-l-gold-400/70">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full text-2xs font-semibold text-white" style={{ background: u.avatarColor }}>{iniciales}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">{u.nombre}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-600">{ETIQUETA_ROL[u.rol]}</span></td>
                    <td className="px-4 py-3 text-slate-600">{u.areaSlug ? NOMBRE_AREA[u.areaSlug] ?? u.areaSlug : "Todas"}</td>
                    <td className="px-4 py-3">
                      {u.activo === false
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-2xs font-medium text-estado-obsoleto">Inactivo</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-2xs font-medium text-estado-vigente">Activo</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => setEditando(u)} title="Editar" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"><Pencil size={16} /></button>
                        {u.id !== adminId && (
                          <button onClick={() => toggleActivo(u)} title={u.activo === false ? "Activar" : "Desactivar"}
                            className={`flex h-8 w-8 items-center justify-center rounded-md transition ${u.activo === false ? "text-slate-500 hover:bg-green-50 hover:text-estado-vigente" : "text-slate-400 hover:bg-red-50 hover:text-estado-obsoleto"}`}>
                            {u.activo === false ? <UserCheck size={16} /> : <UserX size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtrados.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
            <span>Mostrando <b className="text-slate-700">{inicio}–{fin}</b> de {filtrados.length} usuario{filtrados.length !== 1 ? "s" : ""}</span>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="rounded border border-slate-200 px-2 py-1 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                >Anterior</button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={
                      n === paginaActual
                        ? "rounded bg-ink-900 px-2.5 py-1 font-medium text-white ring-1 ring-gold-400/60 ring-offset-1 ring-offset-white"
                        : "rounded border border-slate-200 px-2.5 py-1 text-slate-500 transition hover:bg-slate-50"
                    }
                  >{n}</button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="rounded border border-slate-200 px-2 py-1 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                >Siguiente</button>
              </div>
            )}
          </div>
        )}
        {filtrados.length === 0 && (
          <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">0 usuarios</div>
        )}
      </div>

      {modalNuevo && <UsuarioModal onCerrar={() => setModalNuevo(false)} onGuardado={tras} />}
      {editando && <UsuarioModal usuario={editando} onCerrar={() => setEditando(null)} onGuardado={tras} />}
    </div>
  );
}

function UsuarioModal({
  usuario, onCerrar, onGuardado,
}: { usuario?: UsuarioPublico; onCerrar: () => void; onGuardado: (u: UsuarioPublico) => void }) {
  const esNuevo = !usuario;
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? "OPERARIO");
  const [cargo, setCargo] = useState(usuario?.cargo ?? "");
  const [areaSlug, setAreaSlug] = useState(usuario?.areaSlug ?? AREAS[0].slug);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setError("");
    setGuardando(true);
    const payload: Record<string, unknown> = {
      nombre, rol, cargo, areaSlug: rol === "GERENTE_GENERAL" ? null : areaSlug,
    };
    if (esNuevo) { payload.email = email; payload.password = password; }
    else if (password) payload.password = password;

    const url = esNuevo ? "/api/users" : `/api/users/${usuario!.id}`;
    const res = await fetch(url, {
      method: esNuevo ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) { setError(data.error ?? "No se pudo guardar."); return; }
    onGuardado(data.usuario);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onCerrar} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{esNuevo ? "Nuevo usuario" : "Editar usuario"}</h3>
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X size={19} /></button>
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          <Campo label="Nombre completo"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className="inp" placeholder="Ej. Juan Pérez" /></Campo>
          <Campo label="Cargo"><input value={cargo} onChange={(e) => setCargo(e.target.value)} className="inp" placeholder="Ej. Jefe de Producción" /></Campo>
          <Campo label="Correo">
            <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!esNuevo} type="email" placeholder="nombre@comproint.com"
              className="inp disabled:bg-slate-100 disabled:text-slate-400" />
          </Campo>
          <Campo label={esNuevo ? "Contraseña" : "Nueva contraseña (opcional)"}>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••" className="inp" />
          </Campo>
          <Campo label="Rol">
            <select value={rol} onChange={(e) => setRol(e.target.value as Rol)} className="inp">
              {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
            </select>
          </Campo>
          {rol !== "GERENTE_GENERAL" && (
            <Campo label="Área">
              <select value={areaSlug} onChange={(e) => setAreaSlug(e.target.value)} className="inp">
                {AREAS.map((a) => <option key={a.slug} value={a.slug}>{a.nombre}</option>)}
              </select>
            </Campo>
          )}
        </div>
        {error && <p className="mx-5 mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-estado-obsoleto">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button onClick={onCerrar} className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="btn-primary">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {esNuevo ? "Crear usuario" : "Guardar cambios"}
          </button>
        </div>
      </div>
      <style jsx>{`
        .inp { height: 2.5rem; width: 100%; border-radius: 0.375rem; border: 1px solid rgb(203 213 225); padding: 0 0.75rem; font-size: 0.875rem; color: rgb(51 65 85); outline: none; }
        .inp:focus { border-color: #235684; box-shadow: 0 0 0 2px #d8e5f1; }
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
