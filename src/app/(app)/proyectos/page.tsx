import { getUsuarioActual } from "@/lib/session";
import { documentosVisiblesTodos } from "@/server/services/document.service";
import { listarProyectos } from "@/server/services/project.service";
import { puedeCrearProyectos } from "@/lib/permissions";
import { ProjectsIndex } from "@/components/ProjectsIndex";

// Índice de todos los proyectos (apartado dedicado).
export default async function ProyectosPage() {
  const user = (await getUsuarioActual())!;
  const [proyectos, visibles] = await Promise.all([
    listarProyectos(),
    documentosVisiblesTodos(user),
  ]);
  const items = proyectos.map((p) => ({
    proyecto: p,
    docs: visibles.filter((d) => d.proyectoSlug === p.slug).length,
  }));
  return <ProjectsIndex items={items} puedeCrear={puedeCrearProyectos(user)} />;
}
