import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/session";
import { puedeGestionarUsuarios } from "@/lib/permissions";
import { listarUsuarios } from "@/server/services/user.service";
import { UsersAdmin } from "@/components/UsersAdmin";

export default async function UsuariosPage() {
  const user = (await getUsuarioActual())!;
  if (!puedeGestionarUsuarios(user)) redirect("/dashboard");
  const usuarios = await listarUsuarios(user);
  return <UsersAdmin usuariosIniciales={usuarios} adminId={user.id} />;
}
