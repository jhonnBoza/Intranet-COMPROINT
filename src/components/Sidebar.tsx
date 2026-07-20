"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Crown, BadgeCheck, Factory, FolderKanban, Truck, Briefcase,
  LayoutDashboard, ChevronRight, FolderGit2, X, Users, ScrollText, Trash2, type LucideIcon,
} from "lucide-react";
import type { Area, UsuarioPublico } from "@/types";
import { puedeGestionarArea, puedeGestionarUsuarios } from "@/lib/permissions";

const ICONOS: Record<string, LucideIcon> = { Crown, BadgeCheck, Factory, FolderKanban, Truck, Briefcase };

interface Props {
  areas: Area[];
  user: UsuarioPublico;
  abierto: boolean;
  onCerrar: () => void;
}

export function Sidebar({ areas, user, abierto, onCerrar }: Props) {
  const pathname = usePathname();

  return (
    <>
      {abierto && <div className="fixed inset-0 top-14 z-30 bg-ink-950/40 lg:hidden" onClick={onCerrar} />}

      <aside
        className={`fixed bottom-0 left-0 top-14 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:top-0 lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <Seccion titulo="General" />
          <NavLink href="/dashboard" activo={pathname === "/dashboard"} icon={LayoutDashboard} label="Panel de control" onNavegar={onCerrar} />

          <Seccion titulo="Repositorio documental" />
          <div className="space-y-0.5">
            {areas.map((area) => (
              <AreaItem key={area.slug} area={area} user={user} pathname={pathname} onNavegar={onCerrar} />
            ))}
          </div>

          <Seccion titulo="Proyectos" />
          <NavLink
            href="/proyectos"
            activo={pathname === "/proyectos" || pathname.startsWith("/proyecto/")}
            icon={FolderGit2}
            label="Todos los proyectos"
            onNavegar={onCerrar}
          />

          {puedeGestionarUsuarios(user) && (
            <>
              <Seccion titulo="Administración" />
              <NavLink
                href="/admin/usuarios"
                activo={pathname.startsWith("/admin/usuarios")}
                icon={Users}
                label="Usuarios"
                onNavegar={onCerrar}
              />
              <NavLink
                href="/admin/auditoria"
                activo={pathname.startsWith("/admin/auditoria")}
                icon={ScrollText}
                label="Bitácora de auditoría"
                onNavegar={onCerrar}
              />
              <NavLink
                href="/admin/papelera"
                activo={pathname.startsWith("/admin/papelera")}
                icon={Trash2}
                label="Papelera"
                onNavegar={onCerrar}
              />
            </>
          )}
        </nav>

        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-2xs leading-relaxed text-slate-400">
            Soporte TI · anexo <span className="font-medium text-slate-500">100</span><br />
            <span className="text-slate-400">COMPROINT · Gestión documental</span>
          </p>
        </div>
      </aside>
    </>
  );
}

function Seccion({ titulo }: { titulo: string }) {
  return (
    <p className="px-2 pb-1.5 pt-4 text-2xs font-semibold uppercase tracking-wider text-slate-400 first:pt-0">
      {titulo}
    </p>
  );
}

function AreaItem({
  area, user, pathname, onNavegar,
}: { area: Area; user: UsuarioPublico; pathname: string; onNavegar: () => void }) {
  const router = useRouter();
  const rutaBase = `/area/${area.slug}`;
  const activoArea = pathname.startsWith(rutaBase);
  const [abierto, setAbierto] = useState(activoArea);
  const Icon = ICONOS[area.icono] ?? Factory;
  const puedeGestionar = puedeGestionarArea(user, area.slug);

  // Auto-expandir cuando el área pasa a estar activa (clic en el área).
  useEffect(() => {
    if (activoArea) setAbierto(true);
  }, [activoArea]);

  async function eliminarCarpeta(slug: string, nombre: string) {
    if (!confirm(`¿Eliminar la carpeta "${nombre}"?`)) return;
    const res = await fetch(`/api/subareas?areaSlug=${area.slug}&slug=${slug}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar la carpeta.");
    }
  }

  return (
    <div>
      <div className={`group relative flex items-center rounded-md ${activoArea ? "bg-slate-100" : "hover:bg-slate-50"}`}>
        {activoArea && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-gold-400" />}
        <Link href={rutaBase} onClick={onNavegar} className="flex flex-1 items-center gap-3 px-2.5 py-2">
          <Icon size={17} className={activoArea ? "text-slate-700" : "text-slate-400"} strokeWidth={1.9} />
          <span className={`text-[13.5px] ${activoArea ? "font-medium text-slate-900" : "text-slate-600"}`}>{area.nombre}</span>
        </Link>
        <button onClick={() => setAbierto((v) => !v)} className="px-2 py-2 text-slate-300 hover:text-slate-500" aria-label="Expandir sub-áreas">
          <ChevronRight size={14} className={`transition-transform ${abierto ? "rotate-90" : ""}`} />
        </button>
      </div>

      {abierto && (
        <div className="my-0.5 ml-[18px] border-l border-slate-200 pl-3">
          {area.subareas.map((sa) => (
            <div key={sa.slug} className="group/sa relative flex items-center rounded-md hover:bg-slate-50">
              <Link href={`${rutaBase}?sub=${sa.slug}`} onClick={onNavegar}
                className="flex-1 truncate rounded-md px-2.5 py-1.5 text-[12.5px] text-slate-500 hover:text-slate-800">
                {sa.nombre}
              </Link>
              {puedeGestionar && (
                <button
                  onClick={() => eliminarCarpeta(sa.slug, sa.nombre)}
                  title="Eliminar carpeta"
                  className="mr-1 hidden h-5 w-5 shrink-0 items-center justify-center rounded text-slate-300 hover:bg-red-50 hover:text-estado-obsoleto group-hover/sa:flex"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NavLink({
  href, activo, icon: Icon, label, onNavegar,
}: { href: string; activo: boolean; icon: LucideIcon; label: string; onNavegar: () => void }) {
  return (
    <Link href={href} onClick={onNavegar}
      className={`relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] transition-colors ${
        activo ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700 hover:bg-slate-50"
      }`}>
      {activo && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-gold-400" />}
      <Icon size={17} className={activo ? "text-slate-700" : "text-slate-400"} strokeWidth={1.9} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
