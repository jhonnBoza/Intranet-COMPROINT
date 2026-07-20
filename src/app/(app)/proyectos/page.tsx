import { getUsuarioActual } from "@/lib/session";
import { contarDocumentosPorProyecto } from "@/server/services/document.service";
import { listarProyectos } from "@/server/services/project.service";
import { puedeCrearProyectos } from "@/lib/permissions";
import { ProjectsIndex } from "@/components/ProjectsIndex";

// Índice de todos los proyectos (apartado dedicado).
export default async function ProyectosPage() {
  const user = (await getUsuarioActual())!;
  const [proyectos, conteos] = await Promise.all([
    listarProyectos(),
    contarDocumentosPorProyecto(user),
  ]);
  const items = proyectos.map((p) => ({
    proyecto: p,
    docs: conteos[p.slug] ?? 0,
  }));
  return <ProjectsIndex items={items} puedeCrear={puedeCrearProyectos(user)} />;
}
