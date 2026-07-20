import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/session";
import { documentosPendientes } from "@/server/services/document.service";
import { ApprovalPanel } from "@/components/ApprovalPanel";

// Bandeja de documentos en revisión que este usuario puede aprobar.
export default async function PendientesPage() {
  const user = (await getUsuarioActual())!;
  if (user.rol === "OPERARIO") redirect("/dashboard");
  const documentos = await documentosPendientes(user);
  return <ApprovalPanel documentosIniciales={documentos} />;
}
