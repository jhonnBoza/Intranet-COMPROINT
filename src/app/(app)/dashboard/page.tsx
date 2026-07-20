import Link from "next/link";
import {
  Crown, BadgeCheck, Factory, FolderKanban, Truck, Briefcase,
  ChevronRight, TriangleAlert, type LucideIcon,
} from "lucide-react";
import { getUsuarioActual } from "@/lib/session";
import { AREAS } from "@/server/data/areas";
import { areasVisibles, puedePublicarAnuncios } from "@/lib/permissions";
import { documentosRecientes, contarDocumentos, contarDocumentosPorArea, contarVencimientos } from "@/server/services/document.service";
import { listarAnuncios } from "@/server/services/announcement.service";
import { FileIcon } from "@/components/FileIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { AnnouncementsPanel } from "@/components/AnnouncementsPanel";
import { formatoFecha } from "@/lib/format";

const ICONOS: Record<string, LucideIcon> = { Crown, BadgeCheck, Factory, FolderKanban, Truck, Briefcase };

export default async function DashboardPage() {
  const user = (await getUsuarioActual())!;
  const FECHA_HOY = new Date().toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const areas = areasVisibles(user, AREAS);
  const [conteos, porArea, recientes, anuncios, venc] = await Promise.all([
    contarDocumentos(user),
    contarDocumentosPorArea(user),
    documentosRecientes(user, 6),
    listarAnuncios(user),
    contarVencimientos(user),
  ]);

  const { total, enRevision, obsoletos } = conteos;
  const contar = (slug: string) => porArea[slug] ?? 0;

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">Panel de control</h1>
          <p className="mt-1 text-sm text-slate-500">Bienvenido, {user.nombre}</p>
        </div>
        <p className="hidden text-sm capitalize text-slate-400 sm:block">{FECHA_HOY}</p>
      </div>

      {/* Aviso de vencimientos (control de revisión ISO) */}
      {(venc.vencidos > 0 || venc.porVencer > 0) && (
        <Link
          href="/vencimientos"
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition hover:brightness-[0.98] ${
            venc.vencidos > 0
              ? "border-red-200 bg-red-50 text-estado-obsoleto"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <TriangleAlert size={18} className="shrink-0" />
          <span className="flex-1 font-medium">
            {venc.vencidos > 0 && <>{venc.vencidos} documento{venc.vencidos !== 1 ? "s" : ""} vencido{venc.vencidos !== 1 ? "s" : ""}</>}
            {venc.vencidos > 0 && venc.porVencer > 0 && <> · </>}
            {venc.porVencer > 0 && <>{venc.porVencer} por vencer (≤30 días)</>}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold">Revisar <ChevronRight size={14} /></span>
        </Link>
      )}

      {/* KPIs — barra de métricas sobria */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-4 sm:divide-y-0">
        <Kpi label="Áreas con acceso" valor={areas.length} />
        <Kpi label="Documentos accesibles" valor={total} destacado />
        <Kpi label="En revisión" valor={enRevision} sufijo={enRevision > 0 ? "revision" : undefined}
          href={user.rol !== "OPERARIO" ? "/pendientes" : undefined} />
        <Kpi label="Obsoletos" valor={obsoletos} sufijo={obsoletos > 0 ? "obsoleto" : undefined} />
      </div>

      {/* Áreas — lista limpia */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-slate-700">Repositorio por área</h2>
          <span className="text-xs text-slate-400">{areas.length} áreas</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {areas.map((area, i) => {
            const Icon = ICONOS[area.icono] ?? Factory;
            const n = contar(area.slug);
            return (
              <Link
                key={area.slug}
                href={`/area/${area.slug}`}
                className={`group flex items-center gap-3.5 px-4 py-3 transition hover:bg-slate-50 ${i > 0 ? "border-t border-slate-100" : ""}`}
              >
                <Icon size={18} className="text-slate-400" strokeWidth={1.9} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{area.nombre}</p>
                  <p className="text-xs text-slate-400">{area.descripcion}</p>
                </div>
                <span className="tabular text-xs text-slate-400">{n} doc{n !== 1 ? "s" : ""}</span>
                <ChevronRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recientes + Anuncios */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium text-slate-700">Últimas actualizaciones</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-2xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5 font-medium">Documento</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Autor</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/area/${d.areaSlug}`} className="flex items-center gap-2.5">
                        <FileIcon tipo={d.tipo} size={16} />
                        <span className="min-w-0">
                          {d.codigo && <span className="mr-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-2xs font-semibold tabular text-brand-700">{d.codigo}</span>}
                          <span className="font-medium text-slate-700 hover:text-ink-900">{d.nombre}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">{d.autor}</td>
                    <td className="px-4 py-2.5"><StatusBadge estado={d.estado} /></td>
                    <td className="px-4 py-2.5 text-right tabular text-slate-500">{formatoFecha(d.fechaSubida)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <AnnouncementsPanel anunciosIniciales={anuncios} puedePublicar={puedePublicarAnuncios(user)} usuario={{ rol: user.rol, areaSlug: user.areaSlug }} />
      </div>
    </div>
  );
}

function Kpi({
  label,
  valor,
  sufijo,
  destacado,
  href,
}: {
  label: string;
  valor: number;
  sufijo?: "revision" | "obsoleto";
  destacado?: boolean;
  href?: string;
}) {
  const color = sufijo === "revision" ? "text-estado-revision" : sufijo === "obsoleto" ? "text-estado-obsoleto" : destacado ? "text-gold-600" : "text-ink-900";
  const contenido = (
    <>
      {destacado && <span className="absolute inset-x-0 top-0 h-0.5 bg-gold-400" />}
      <p className={`text-[26px] font-semibold leading-none tabular ${color}`}>{valor}</p>
      <p className="mt-2 text-xs text-slate-500">{label}{href && valor > 0 ? " →" : ""}</p>
    </>
  );
  if (href && valor > 0) {
    return <Link href={href} className="relative block px-5 py-4 transition hover:bg-slate-50">{contenido}</Link>;
  }
  return <div className="relative px-5 py-4">{contenido}</div>;
}
