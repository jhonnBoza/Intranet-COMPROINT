import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/session";

// Ruta raíz: manda al dashboard si hay sesión, si no al login.
export default async function Home() {
  const user = await getUsuarioActual();
  redirect(user ? "/dashboard" : "/login");
}
