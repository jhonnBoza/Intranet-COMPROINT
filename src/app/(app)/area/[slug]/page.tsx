import { notFound, redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/session";
import { getArea } from "@/server/data/areas";
import { puedeVerArea } from "@/lib/permissions";
import { listarDocumentosDeArea } from "@/server/services/document.service";
import { subareasDeArea } from "@/server/services/subarea.service";
import { AreaRepository } from "@/components/AreaRepository";

export default async function AreaPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { sub?: string };
}) {
  const user = (await getUsuarioActual())!;
  const area = getArea(params.slug);
  if (!area) notFound();

  // Control de acceso: si el rol no puede ver el área, fuera.
  if (!puedeVerArea(user, area.slug)) {
    redirect("/dashboard");
  }

  const [docs, subareas] = await Promise.all([
    listarDocumentosDeArea(user, area.slug),
    subareasDeArea(area.slug),
  ]);

  return (
    <AreaRepository
      area={{ ...area, subareas }}
      user={user}
      docsIniciales={docs}
      subInicial={searchParams.sub}
    />
  );
}
