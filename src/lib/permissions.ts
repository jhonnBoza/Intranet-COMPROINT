import type { Usuario, UsuarioPublico, Documento, Area, Confidencialidad } from "@/types";

// ============================================================
//  CAPA DE PERMISOS — el corazón del sistema.
//
//  Toda decisión de "¿puede este usuario hacer X?" vive AQUÍ,
//  nunca en los componentes ni pegada a la base de datos.
//  Así es testeable y no se riega por todo el código.
//
//  Jerarquía (de mayor a menor privilegio):
//    GERENTE_GENERAL > JEFE_AREA > SUPERVISOR > OPERARIO
// ============================================================

type U = Usuario | UsuarioPublico;

/** El Gerente General tiene alcance global (ve/gestiona todo). */
export function esGlobal(user: U): boolean {
  return user.rol === "GERENTE_GENERAL";
}

/** ¿El usuario pertenece a esta área? (o es global) */
function perteneceAlArea(user: U, areaSlug: string): boolean {
  return esGlobal(user) || user.areaSlug === areaSlug;
}

// ------------------------------------------------------------
//  Permisos sobre ÁREAS (navegación / repositorio)
// ------------------------------------------------------------

/** ¿Puede ver (entrar a) el área en el menú lateral? */
export function puedeVerArea(user: U, areaSlug: string): boolean {
  return perteneceAlArea(user, areaSlug);
}

/** Áreas visibles para este usuario, filtrando la lista completa. */
export function areasVisibles(user: U, todas: Area[]): Area[] {
  if (esGlobal(user)) return todas;
  return todas.filter((a) => a.slug === user.areaSlug);
}

/** ¿Puede subir documentos a esta área? (Operario no puede) */
export function puedeSubir(user: U, areaSlug: string): boolean {
  if (user.rol === "OPERARIO") return false;
  return perteneceAlArea(user, areaSlug);
}

/** ¿Puede crear carpetas / gestionar la estructura del área? */
export function puedeGestionarArea(user: U, areaSlug: string): boolean {
  if (user.rol === "GERENTE_GENERAL") return true;
  if (user.rol === "JEFE_AREA") return user.areaSlug === areaSlug;
  return false;
}

// ------------------------------------------------------------
//  Permisos sobre DOCUMENTOS
// ------------------------------------------------------------

/** Regla de confidencialidad: ¿el nivel del doc es visible para el rol? */
function pasaConfidencialidad(user: U, nivel: Confidencialidad): boolean {
  if (esGlobal(user)) return true;
  switch (nivel) {
    case "publico":
      return true; // todo el área
    case "jefes":
      return user.rol === "JEFE_AREA";
    case "restringido":
      return false; // solo global (o dueños explícitos, fuera de este demo)
    default:
      return false;
  }
}

/** ¿Puede VER / DESCARGAR este documento? */
export function puedeVerDocumento(user: U, doc: Documento): boolean {
  if (esGlobal(user)) return true;
  if (user.areaSlug !== doc.areaSlug) return false;
  return pasaConfidencialidad(user, doc.confidencialidad);
}

/** Filtra una lista de documentos dejando solo los visibles. */
export function documentosVisibles(user: U, docs: Documento[]): Documento[] {
  return docs.filter((d) => puedeVerDocumento(user, d));
}

/** ¿Puede EDITAR / aprobar / cambiar estado del documento? */
export function puedeEditarDocumento(user: U, doc: Documento): boolean {
  if (esGlobal(user)) return true;
  // Prerrequisito: nadie edita un documento que no puede ver (ej. restringido).
  if (!puedeVerDocumento(user, doc)) return false;
  if (user.rol === "JEFE_AREA") return user.areaSlug === doc.areaSlug;
  // El Supervisor solo puede intervenir documentos en revisión de su sub-área.
  if (user.rol === "SUPERVISOR") {
    return (
      user.areaSlug === doc.areaSlug &&
      doc.estado === "revision"
    );
  }
  return false; // Operario: solo lectura
}

/** ¿Puede ELIMINAR / marcar obsoleto? (acción destructiva → restringida) */
export function puedeEliminarDocumento(user: U, doc: Documento): boolean {
  if (esGlobal(user)) return true;
  if (!puedeVerDocumento(user, doc)) return false; // no elimina lo que no puede ver
  if (user.rol === "JEFE_AREA") return user.areaSlug === doc.areaSlug;
  return false; // Supervisor y Operario no eliminan
}

// ------------------------------------------------------------
//  Acciones disponibles por documento (para pintar la UI)
// ------------------------------------------------------------

export interface AccionesDoc {
  ver: boolean;
  descargar: boolean;
  editar: boolean;
  eliminar: boolean;
}

export function accionesSobreDocumento(user: U, doc: Documento): AccionesDoc {
  const ver = puedeVerDocumento(user, doc);
  return {
    ver,
    descargar: ver,
    editar: puedeEditarDocumento(user, doc),
    eliminar: puedeEliminarDocumento(user, doc),
  };
}

// ------------------------------------------------------------
//  Permisos sobre ANUNCIOS CORPORATIVOS
// ------------------------------------------------------------

/** ¿Puede publicar anuncios? Solo Gerencia y Jefes de Área. */
export function puedePublicarAnuncios(user: U): boolean {
  return user.rol === "GERENTE_GENERAL" || user.rol === "JEFE_AREA";
}

/** ¿Puede crear proyectos? Solo Gerencia y Jefes de Área. */
export function puedeCrearProyectos(user: U): boolean {
  return user.rol === "GERENTE_GENERAL" || user.rol === "JEFE_AREA";
}

/** ¿Puede administrar usuarios? Solo el Gerente General. */
export function puedeGestionarUsuarios(user: U): boolean {
  return user.rol === "GERENTE_GENERAL";
}

// ------------------------------------------------------------
//  Etiquetas legibles del rol (para la UI)
// ------------------------------------------------------------

export const ETIQUETA_ROL: Record<Usuario["rol"], string> = {
  GERENTE_GENERAL: "Gerente General",
  JEFE_AREA: "Jefe de Área",
  SUPERVISOR: "Supervisor / Inspector",
  OPERARIO: "Operario",
};
