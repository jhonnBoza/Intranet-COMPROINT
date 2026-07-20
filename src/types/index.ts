// ============================================================
//  Tipos centrales del dominio — Intranet COMPROINT
// ============================================================

/** Roles jerárquicos de la empresa (de mayor a menor privilegio). */
export type Rol =
  | "GERENTE_GENERAL"
  | "JEFE_AREA"
  | "SUPERVISOR"
  | "OPERARIO";

/** Estado del ciclo de vida documental (ISO 9001). */
export type EstadoDocumento = "vigente" | "revision" | "obsoleto";

/** Nivel de confidencialidad de un documento. */
export type Confidencialidad = "publico" | "jefes" | "restringido";

/** Tipos de archivo soportados. */
export type TipoArchivo = "pdf" | "docx" | "xlsx" | "pptx" | "zip" | "dwg" | "img";

/** Un área principal del organigrama, con sus sub-áreas. */
export interface Area {
  slug: string;
  nombre: string;
  descripcion: string;
  icono: string; // nombre de icono lucide
  subareas: SubArea[];
}

export interface SubArea {
  slug: string;
  nombre: string;
}

/** Usuario del sistema. */
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string; // mock — en producción sería un hash (bcrypt/argon2)
  rol: Rol;
  cargo: string; // ej. "Jefe de Producción"
  areaSlug: string | null; // null = alcance global (Gerente General)
  subareaSlug: string | null;
  avatarColor: string;
  activo?: boolean; // usuario activo (puede iniciar sesión)
}

/** Documento almacenado. */
export interface Documento {
  id: string;
  codigo?: string | null; // código correlativo ISO (ej. CAL-PRC-001), generado por la app
  nombre: string;
  tipo: TipoArchivo;
  categoria: "Procedimiento" | "Formato" | "Manual" | "Registro" | "Plano" | "Reporte";
  areaSlug: string;
  subareaSlug: string | null;
  fechaSubida: string; // ISO
  autor: string;
  estado: EstadoDocumento;
  confidencialidad: Confidencialidad;
  version: string;
  tamano: string; // ej. "2.4 MB"
  proyectoSlug?: string | null; // proyecto al que pertenece (opcional)
  soloVista?: boolean; // true = solo vista previa, sin descarga
  fechaAprobacion?: string | null; // YYYY-MM-DD
  fechaProximaRevision?: string | null; // YYYY-MM-DD
  periodoRevisionMeses?: number | null;
}

/** Un proyecto: agrupa documentos de varias áreas (expediente transversal). */
export interface Proyecto {
  slug: string;
  nombre: string;
  descripcion: string;
  estado: "en-curso" | "cerrado";
}

/** Anuncio corporativo del dashboard. */
export interface Anuncio {
  id: string;
  titulo: string;
  cuerpo: string;
  fecha: string;
  autor: string;
  prioridad: "alta" | "normal";
}

/** Usuario sin la contraseña — lo que viaja al cliente. */
export type UsuarioPublico = Omit<Usuario, "password">;
