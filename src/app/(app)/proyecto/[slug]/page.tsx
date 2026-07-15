import { notFound } from "next/navigation";
import { getUsuarioActual } from "@/lib/session";
import { obtenerProyecto } from "@/server/services/project.service";
import { listarDocumentosDeProyecto } from "@/server/services/document.service";
import { ProjectRepository } from "@/components/ProjectRepository";

export default async function ProyectoPage({ params }: { params: { slug: string } }) {
  const user = (await getUsuarioActual())!;
  const proyecto = await obtenerProyecto(params.slug);
  if (!proyecto) notFound();

  const docs = await listarDocumentosDeProyecto(user, proyecto.slug);

  return <ProjectRepository proyecto={proyecto} user={user} docsIniciales={docs} />;
}
