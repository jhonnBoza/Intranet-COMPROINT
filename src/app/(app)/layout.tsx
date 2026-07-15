import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/session";
import { AREAS } from "@/server/data/areas";
import { areasVisibles } from "@/lib/permissions";
import { subareasPorArea } from "@/server/services/subarea.service";
import { AppShell } from "@/components/AppShell";

// Layout de las páginas internas: exige sesión y arma el shell.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUsuarioActual();
  if (!user) redirect("/login");

  const submap = await subareasPorArea();
  const areas = areasVisibles(user, AREAS).map((a) => ({
    ...a,
    subareas: submap[a.slug] ?? a.subareas,
  }));

  return (
    <AppShell areas={areas} user={user}>
      {children}
    </AppShell>
  );
}
