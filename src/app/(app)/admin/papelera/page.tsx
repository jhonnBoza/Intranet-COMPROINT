import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/session";
import { puedeGestionarUsuarios } from "@/lib/permissions";
import { listarPapelera } from "@/server/services/document.service";
import { TrashPanel } from "@/components/TrashPanel";

export default async function PapeleraPage() {
  const user = (await getUsuarioActual())!;
  if (!puedeGestionarUsuarios(user)) redirect("/dashboard");
  const documentos = await listarPapelera(user);
  return <TrashPanel documentosIniciales={documentos} />;
}
