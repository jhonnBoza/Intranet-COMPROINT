// Esqueleto que se muestra al instante mientras carga cada sección.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Título */}
      <div className="space-y-2">
        <div className="h-6 w-56 rounded bg-slate-200" />
        <div className="h-4 w-72 rounded bg-slate-100" />
      </div>

      {/* Barra de filtros / KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-slate-200 bg-white" />
        ))}
      </div>

      {/* Tabla / lista */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="h-10 border-b border-slate-200 bg-slate-50" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
            <div className="h-8 w-8 rounded bg-slate-200" />
            <div className="h-4 flex-1 rounded bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-4 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
