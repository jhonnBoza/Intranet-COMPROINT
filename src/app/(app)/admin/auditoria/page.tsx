import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/session";
import { puedeGestionarUsuarios } from "@/lib/permissions";
import { listarAuditoria } from "@/server/services/audit.service";
import { AuditLog } from "@/components/AuditLog";

export default async function AuditoriaPage() {
  const user = (await getUsuarioActual())!;
  if (!puedeGestionarUsuarios(user)) redirect("/dashboard");
  const inicial = await listarAuditoria(user, { page: 1 });
  return <AuditLog inicial={inicial} />;
}
