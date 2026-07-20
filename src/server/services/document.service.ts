import { prisma } from "@/lib/db";
import {
  puedeSubir,
  puedeVerDocumento,
  puedeEditarDocumento,
  puedeEliminarDocumento,
  puedeGestionarUsuarios,
  esGlobal,
  nivelesVisibles,
} from "@/lib/permissions";
import { randomUUID } from "crypto";
import {
  subirArchivo,
  urlFirmada,
  borrarArchivos,
  descargarArchivo,
  crearUrlSubida,
  existeArchivo,
} from "@/lib/storage";
import type { Documento, UsuarioPublico, TipoArchivo, EstadoDocumento, Confidencialidad } from "@/types";

// ============================================================
//  SERVICIO DE DOCUMENTOS — capa de negocio (Prisma / Supabase).
//  La visibilidad por permisos se empuja a SQL (no se trae toda
//  la tabla a memoria) y el borrado es lógico (papelera reversible).
// ============================================================

const asDocs = (rows: unknown): Documento[] => rows as Documento[];

/** Quita campos internos antes de exponer al cliente. */
function limpiar(doc: unknown): Documento {
  const { storagePath, mime, eliminado, eliminadoEn, eliminadoPor, ...pub } =
    doc as Record<string, unknown>;
  return pub as unknown as Documento;
}
const limpiarLista = (docs: Documento[]): Documento[] => docs.map(limpiar);

/** ID único (evita colisiones por milisegundo). */
function nuevoId(prefijo: string): string {
  return `${prefijo}-${randomUUID().slice(0, 12)}`;
}

/** Filtro de visibilidad en SQL (excluye lo que el usuario no puede ver). */
function whereVisible(user: UsuarioPublico): Record<string, unknown> {
  if (esGlobal(user)) return {};
  return {
    areaSlug: user.areaSlug ?? "__sin_area__",
    confidencialidad: { in: nivelesVisibles(user) },
  };
}

export interface FiltrosDocumento {
  categoria?: string;
  subareaSlug?: string;
  estado?: string;
  busqueda?: string;
}

/** Lista los documentos de un área que el usuario puede ver, con filtros (todo en SQL). */
export async function listarDocumentosDeArea(
  user: UsuarioPublico,
  areaSlug: string,
  filtros: FiltrosDocumento = {},
): Promise<Documento[]> {
  // Un usuario no-global solo ve su propia área.
  if (!esGlobal(user) && user.areaSlug !== areaSlug) return [];

  const where: Record<string, unknown> = { areaSlug, eliminado: false };
  if (!esGlobal(user)) where.confidencialidad = { in: nivelesVisibles(user) };
  if (filtros.categoria && filtros.categoria !== "todos") where.categoria = filtros.categoria;
  if (filtros.subareaSlug && filtros.subareaSlug !== "todos") where.subareaSlug = filtros.subareaSlug;
  if (filtros.estado && filtros.estado !== "todos") where.estado = filtros.estado;

  const rows = asDocs(
    await prisma.documento.findMany({ where, orderBy: { fechaSubida: "desc" } }),
  );
  return limpiarLista(rows);
}

/** Conteos de documentos visibles para los KPIs del panel (sin traer filas). */
export async function contarDocumentos(
  user: UsuarioPublico,
): Promise<{ total: number; enRevision: number; obsoletos: number }> {
  const base = { ...whereVisible(user), eliminado: false };
  const [total, enRevision, obsoletos] = await Promise.all([
    prisma.documento.count({ where: base }),
    prisma.documento.count({ where: { ...base, estado: "revision" } }),
    prisma.documento.count({ where: { ...base, estado: "obsoleto" } }),
  ]);
  return { total, enRevision, obsoletos };
}

/** Documentos recientes visibles para el dashboard (orden y límite en SQL). */
export async function documentosRecientes(
  user: UsuarioPublico,
  limite = 6,
): Promise<Documento[]> {
  const rows = asDocs(
    await prisma.documento.findMany({
      where: { ...whereVisible(user), eliminado: false },
      orderBy: { fechaSubida: "desc" },
      take: limite,
    }),
  );
  return limpiarLista(rows);
}

/** Búsqueda global (barra superior). Busca en nombre, autor y categoría, en SQL. */
export async function buscarGlobal(
  user: UsuarioPublico,
  query: string,
): Promise<Documento[]> {
  const q = query.trim();
  if (!q) return [];
  const contains = { contains: q, mode: "insensitive" as const };
  const rows = asDocs(
    await prisma.documento.findMany({
      where: {
        ...whereVisible(user),
        eliminado: false,
        OR: [{ nombre: contains }, { autor: contains }, { categoria: contains }],
      },
      orderBy: { fechaSubida: "desc" },
      take: 10,
    }),
  );
  return limpiarLista(rows);
}

/** Documentos de un proyecto (de todas las áreas) que el usuario puede ver. */
export async function listarDocumentosDeProyecto(
  user: UsuarioPublico,
  proyectoSlug: string,
): Promise<Documento[]> {
  const rows = asDocs(
    await prisma.documento.findMany({
      where: { ...whereVisible(user), proyectoSlug, eliminado: false },
      orderBy: { fechaSubida: "desc" },
    }),
  );
  return limpiarLista(rows);
}

/** Documentos en revisión que el usuario puede aprobar (bandeja de pendientes). */
export async function documentosPendientes(user: UsuarioPublico): Promise<Documento[]> {
  if (user.rol === "OPERARIO") return []; // el operario no aprueba nada
  const rows = asDocs(
    await prisma.documento.findMany({
      where: { ...whereVisible(user), estado: "revision", eliminado: false },
      orderBy: { fechaSubida: "desc" },
    }),
  );
  return limpiarLista(rows);
}

/** Cuántos documentos hay pendientes de aprobar para este usuario. */
export async function contarPendientes(user: UsuarioPublico): Promise<number> {
  if (user.rol === "OPERARIO") return 0;
  return prisma.documento.count({
    where: { ...whereVisible(user), estado: "revision", eliminado: false },
  });
}

/** Conteo de documentos visibles por área (para el panel, sin traer filas). */
export async function contarDocumentosPorArea(
  user: UsuarioPublico,
): Promise<Record<string, number>> {
  const grupos = await prisma.documento.groupBy({
    by: ["areaSlug"],
    where: { ...whereVisible(user), eliminado: false },
    _count: true,
  });
  const out: Record<string, number> = {};
  for (const g of grupos) out[g.areaSlug] = g._count;
  return out;
}

/** Conteo de documentos visibles por proyecto (para el índice de proyectos, sin N+1). */
export async function contarDocumentosPorProyecto(
  user: UsuarioPublico,
): Promise<Record<string, number>> {
  const grupos = await prisma.documento.groupBy({
    by: ["proyectoSlug"],
    where: { ...whereVisible(user), eliminado: false, proyectoSlug: { not: null } },
    _count: true,
  });
  const out: Record<string, number> = {};
  for (const g of grupos) if (g.proyectoSlug) out[g.proyectoSlug] = g._count;
  return out;
}

export interface NuevoDocumento {
  nombre: string;
  tipo: TipoArchivo;
  categoria: Documento["categoria"];
  areaSlug: string;
  subareaSlug: string | null;
  confidencialidad: Documento["confidencialidad"];
  tamano: string;
  proyectoSlug?: string | null;
  storagePath?: string | null;       // subida directa (ya subido por el cliente)
  contenidoBase64?: string | null;   // subida legacy (archivos pequeños)
  mime?: string | null;
  soloVista?: boolean;
}

/** Registra un documento nuevo (valida permiso de subida y confidencialidad). */
export async function crearDocumento(
  user: UsuarioPublico,
  data: NuevoDocumento,
): Promise<Documento> {
  if (!puedeSubir(user, data.areaSlug)) {
    throw new Error("No tiene permiso para subir documentos a esta área.");
  }
  // No se puede subir con un nivel de confidencialidad que uno mismo no vería.
  if (!nivelesVisibles(user).includes(data.confidencialidad)) {
    throw new Error("No puede asignar un nivel de confidencialidad superior al suyo.");
  }

  const id = nuevoId("d");
  const mime = data.mime || "application/octet-stream";
  let storagePath: string | null = null;

  if (data.storagePath) {
    // Subida directa: el archivo ya está en Storage; verificamos que exista.
    if (!(await existeArchivo(data.storagePath))) {
      throw new Error("El archivo no se subió correctamente. Vuelve a intentarlo.");
    }
    storagePath = data.storagePath;
  } else if (data.contenidoBase64) {
    // Subida legacy (archivos pequeños): subimos aquí.
    storagePath = `${data.areaSlug}/${id}`;
    await subirArchivo(storagePath, Buffer.from(data.contenidoBase64, "base64"), mime);
  }

  try {
    const doc = await prisma.documento.create({
      data: {
        id,
        nombre: data.nombre,
        tipo: data.tipo,
        categoria: data.categoria,
        areaSlug: data.areaSlug,
        subareaSlug: data.subareaSlug,
        fechaSubida: new Date().toISOString(),
        autor: user.nombre,
        estado: "revision",
        confidencialidad: data.confidencialidad,
        version: "1.0",
        tamano: data.tamano || "—",
        proyectoSlug: data.proyectoSlug ?? null,
        storagePath,
        mime: storagePath ? mime : null,
        soloVista: !!data.soloVista,
      },
    });
    return limpiar(doc);
  } catch (e) {
    // Si el insert falla, no dejamos el archivo huérfano en Storage.
    if (storagePath) {
      try { await borrarArchivos([storagePath]); } catch { /* limpieza best-effort */ }
    }
    throw e;
  }
}

type DocConArchivo = Documento & {
  storagePath?: string | null;
  mime?: string | null;
  soloVista?: boolean;
  eliminado?: boolean;
};

/** Busca un documento vivo (no en papelera) por id. */
async function docVivo(id: string): Promise<DocConArchivo | null> {
  const doc = (await prisma.documento.findUnique({ where: { id } })) as DocConArchivo | null;
  if (!doc || doc.eliminado) return null;
  return doc;
}

/** URL firmada para DESCARGAR el archivo (bloquea si es "solo vista"). */
export async function obtenerUrlDescarga(
  user: UsuarioPublico,
  id: string,
): Promise<{ url: string; nombre: string; areaSlug: string } | null> {
  const doc = await docVivo(id);
  if (!doc) return null;
  if (!puedeVerDocumento(user, doc)) throw new Error("Sin permiso para ver este documento.");
  if (doc.soloVista) throw new Error("Este documento es solo de vista previa; no se puede descargar.");
  if (!doc.storagePath) return null;
  const url = await urlFirmada(doc.storagePath, doc.nombre);
  if (!url) return null;
  return { url, nombre: doc.nombre, areaSlug: doc.areaSlug };
}

/** Bytes del archivo para VISTA PREVIA embebida (valida permiso). */
export async function obtenerArchivoVista(
  user: UsuarioPublico,
  id: string,
): Promise<{ buffer: Buffer; mime: string; nombre: string } | null> {
  const doc = await docVivo(id);
  if (!doc) return null;
  if (!puedeVerDocumento(user, doc)) throw new Error("Sin permiso para ver este documento.");
  if (!doc.storagePath) return null;
  const buffer = await descargarArchivo(doc.storagePath);
  if (!buffer) return null;
  return { buffer, mime: doc.mime || "application/octet-stream", nombre: doc.nombre };
}

export interface CambiosDocumento {
  estado?: EstadoDocumento;
  confidencialidad?: Confidencialidad;
  nombre?: string;
  categoria?: string;
  subareaSlug?: string | null;
  proyectoSlug?: string | null;
}

/** Edita metadatos de un documento (estado, confidencialidad, nombre, carpeta, proyecto). */
export async function actualizarDocumento(
  user: UsuarioPublico,
  id: string,
  cambios: CambiosDocumento,
): Promise<Documento> {
  const doc = await docVivo(id);
  if (!doc) throw new Error("Documento no encontrado.");
  if (!puedeEditarDocumento(user, doc)) throw new Error("Sin permiso para editar este documento.");

  if (cambios.confidencialidad && !nivelesVisibles(user).includes(cambios.confidencialidad)) {
    throw new Error("No puede asignar un nivel de confidencialidad superior al suyo.");
  }

  const actualizado = await prisma.documento.update({
    where: { id },
    data: {
      estado: cambios.estado ?? doc.estado,
      confidencialidad: cambios.confidencialidad ?? doc.confidencialidad,
      nombre: cambios.nombre?.trim() || doc.nombre,
      categoria: cambios.categoria ?? doc.categoria,
      subareaSlug: cambios.subareaSlug !== undefined ? cambios.subareaSlug : doc.subareaSlug,
      proyectoSlug: cambios.proyectoSlug !== undefined ? cambios.proyectoSlug : doc.proyectoSlug,
    },
  });
  return limpiar(actualizado);
}

/** Envía un documento a la PAPELERA (borrado lógico, reversible). */
export async function eliminarDocumento(
  user: UsuarioPublico,
  id: string,
): Promise<{ nombre: string; areaSlug: string }> {
  const doc = await docVivo(id);
  if (!doc) throw new Error("Documento no encontrado.");
  if (!puedeEliminarDocumento(user, doc)) throw new Error("Sin permiso para eliminar este documento.");
  await prisma.documento.update({
    where: { id },
    data: { eliminado: true, eliminadoEn: new Date().toISOString(), eliminadoPor: user.nombre },
  });
  return { nombre: doc.nombre, areaSlug: doc.areaSlug };
}

/** Lista la papelera (solo Gerencia). */
export async function listarPapelera(user: UsuarioPublico): Promise<Documento[]> {
  if (!puedeGestionarUsuarios(user)) throw new Error("Sin permiso.");
  const rows = await prisma.documento.findMany({
    where: { eliminado: true },
    orderBy: { eliminadoEn: "desc" },
  });
  // Conserva eliminadoEn/eliminadoPor (útiles en la papelera), quita storagePath/mime.
  return rows.map((d) => {
    const { storagePath, mime, ...pub } = d as Record<string, unknown>;
    return pub as unknown as Documento;
  });
}

/** Restaura un documento de la papelera (solo Gerencia). */
export async function restaurarDocumento(user: UsuarioPublico, id: string): Promise<void> {
  if (!puedeGestionarUsuarios(user)) throw new Error("Sin permiso.");
  await prisma.documento.update({
    where: { id },
    data: { eliminado: false, eliminadoEn: null, eliminadoPor: null },
  });
}

/** Borra DEFINITIVAMENTE un documento y sus archivos (solo Gerencia). */
export async function eliminarDefinitivo(
  user: UsuarioPublico,
  id: string,
): Promise<{ nombre: string }> {
  if (!puedeGestionarUsuarios(user)) throw new Error("Sin permiso.");
  const doc = (await prisma.documento.findUnique({ where: { id } })) as DocConArchivo | null;
  if (!doc) throw new Error("Documento no encontrado.");
  const versiones = await prisma.documentoVersion.findMany({
    where: { documentoId: id },
    select: { storagePath: true },
  });
  const rutas = [doc.storagePath, ...versiones.map((v) => v.storagePath)].filter(Boolean) as string[];
  // Primero la BD (en transacción); si algo falla, no perdemos los archivos.
  await prisma.$transaction([
    prisma.documentoVersion.deleteMany({ where: { documentoId: id } }),
    prisma.documento.delete({ where: { id } }),
  ]);
  // Ya sin referencias: borramos los archivos (huérfano barato si esto falla).
  try { await borrarArchivos(rutas); } catch { /* best-effort */ }
  return { nombre: doc.nombre };
}

// ============================================================
//  VERSIONADO — cada reemplazo archiva la versión anterior.
// ============================================================

/** Calcula el siguiente número de versión (mayor+1.0), tolerante a formatos raros. */
function siguienteVersion(v: string): string {
  const m = /^(\d+)/.exec(v.trim());
  const major = m ? parseInt(m[1], 10) : 1;
  return `${major + 1}.0`;
}

export interface NuevaVersion {
  storagePath?: string | null;     // subida directa
  contenidoBase64?: string | null; // subida legacy
  mime?: string | null;
  tamano: string;
}

/** Sube una nueva versión de forma atómica: archiva la actual y activa la nueva. */
export async function reemplazarArchivo(
  user: UsuarioPublico,
  id: string,
  data: NuevaVersion,
): Promise<Documento> {
  const doc = await docVivo(id);
  if (!doc) throw new Error("Documento no encontrado.");
  if (!puedeEditarDocumento(user, doc)) throw new Error("Sin permiso para editar este documento.");

  const mime = data.mime || "application/octet-stream";
  const n = siguienteVersion(doc.version);
  const nMajor = n.split(".")[0];
  const nuevoPath = `${doc.areaSlug}/${id}-v${nMajor}-${randomUUID().slice(0, 6)}`;

  // 1) Colocar el archivo nuevo ANTES de tocar la BD.
  if (data.storagePath) {
    if (!(await existeArchivo(data.storagePath))) {
      throw new Error("El archivo no se subió correctamente. Vuelve a intentarlo.");
    }
  } else if (data.contenidoBase64) {
    await subirArchivo(nuevoPath, Buffer.from(data.contenidoBase64, "base64"), mime);
  } else {
    throw new Error("Falta el archivo de la nueva versión.");
  }
  const rutaNueva = data.storagePath || nuevoPath;

  // 2) En una transacción: archivar la versión anterior + activar la nueva.
  const ops: any[] = [];
  if (doc.storagePath) {
    ops.push(
      prisma.documentoVersion.create({
        data: {
          documentoId: id,
          version: doc.version,
          storagePath: doc.storagePath,
          mime: doc.mime ?? "application/octet-stream",
          tamano: doc.tamano,
          autor: doc.autor,
          fecha: doc.fechaSubida,
        },
      }),
    );
  }
  ops.push(
    prisma.documento.update({
      where: { id },
      data: {
        storagePath: rutaNueva,
        mime,
        tamano: data.tamano || doc.tamano,
        version: n,
        fechaSubida: new Date().toISOString(),
        autor: user.nombre,
      },
    }),
  );
  const res = await prisma.$transaction(ops);
  return limpiar(res[res.length - 1]);
}

export interface VersionInfo {
  id: string; version: string; tamano: string; autor: string; fecha: string;
}

/** Lista el historial de versiones anteriores de un documento. */
export async function listarVersiones(user: UsuarioPublico, id: string): Promise<VersionInfo[]> {
  const doc = await docVivo(id);
  if (!doc) return [];
  if (!puedeVerDocumento(user, doc)) throw new Error("Sin permiso para ver este documento.");
  const versiones = await prisma.documentoVersion.findMany({
    where: { documentoId: id },
    orderBy: { fecha: "desc" },
  });
  return versiones.map((v) => ({ id: v.id, version: v.version, tamano: v.tamano, autor: v.autor, fecha: v.fecha }));
}

/** URL firmada para descargar una versión anterior. */
export async function obtenerUrlVersion(
  user: UsuarioPublico,
  id: string,
  versionId: string,
): Promise<string | null> {
  const doc = await docVivo(id);
  if (!doc) return null;
  if (!puedeVerDocumento(user, doc)) throw new Error("Sin permiso para ver este documento.");
  if (doc.soloVista) throw new Error("Este documento es solo de vista previa; no se puede descargar.");
  const v = await prisma.documentoVersion.findUnique({ where: { id: versionId } });
  if (!v || v.documentoId !== id) return null;
  return urlFirmada(v.storagePath, `${doc.nombre} (v${v.version})`);
}

// ============================================================
//  Subida directa a Storage — URL firmada para el cliente.
// ============================================================

/** Devuelve una URL firmada para que el cliente suba el archivo directo a Storage. */
export async function urlSubidaDirecta(
  user: UsuarioPublico,
  areaSlug: string,
): Promise<{ path: string; token: string; signedUrl: string }> {
  if (!puedeSubir(user, areaSlug)) {
    throw new Error("No tiene permiso para subir documentos a esta área.");
  }
  const path = `${areaSlug}/${nuevoId("f")}`;
  const res = await crearUrlSubida(path);
  if (!res) throw new Error("No se pudo preparar la subida. Intenta de nuevo.");
  return res;
}
