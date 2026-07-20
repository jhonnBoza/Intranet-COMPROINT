import { getUsuarioActual } from "@/lib/session";
import { documentosPorVencer } from "@/server/services/document.service";
import { VencimientosPanel } from "@/components/VencimientosPanel";

// Documentos por vencer o vencidos que el usuario puede ver (control ISO).
export default async function VencimientosPage() {
  const user = (await getUsuarioActual())!;
  const documentos = await documentosPorVencer(user);
  return <VencimientosPanel documentosIniciales={documentos} />;
}
