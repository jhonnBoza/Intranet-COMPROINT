import { FileText, FileSpreadsheet, FileType, Presentation, FileArchive, PenTool, Image, File } from "lucide-react";
import type { TipoArchivo } from "@/types";

// Icono + color según el tipo de archivo.
const MAPA: Record<TipoArchivo, { Icon: typeof FileText; color: string; bg: string; label: string }> = {
  pdf:  { Icon: FileText,        color: "#dc2626", bg: "#fef2f2", label: "PDF" },
  docx: { Icon: FileType,        color: "#2563eb", bg: "#eff6ff", label: "Word" },
  xlsx: { Icon: FileSpreadsheet, color: "#16a34a", bg: "#f0fdf4", label: "Excel" },
  pptx: { Icon: Presentation,    color: "#ea580c", bg: "#fff7ed", label: "PowerPoint" },
  zip:  { Icon: FileArchive,     color: "#b57c05", bg: "#fdf9ec", label: "Archivo ZIP" },
  dwg:  { Icon: PenTool,         color: "#7c3aed", bg: "#faf5ff", label: "CAD" },
  img:  { Icon: Image,           color: "#d97706", bg: "#fffbeb", label: "Imagen" },
};

export function FileIcon({ tipo, size = 20 }: { tipo: TipoArchivo; size?: number }) {
  const { Icon, color, bg } = MAPA[tipo] ?? { Icon: File, color: "#64748b", bg: "#f8fafc" };
  const box = size + 16;
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg shrink-0"
      style={{ background: bg, width: box, height: box }}
    >
      <Icon size={size} style={{ color }} strokeWidth={1.8} />
    </span>
  );
}

export function etiquetaTipo(tipo: TipoArchivo): string {
  return MAPA[tipo]?.label ?? tipo.toUpperCase();
}
