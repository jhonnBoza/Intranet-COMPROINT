import { prisma } from "@/lib/db";
import {
  documentosVisibles,
  puedeSubir,
  puedeVerDocumento,
  puedeEditarDocumento,
  puedeEliminarDocumento,
} from "@/lib/permissions";
import { randomUUID } from "crypto";
import { subirArchivo, urlFirmada, borrarArchivo, descargarArchivo } from "@/lib/storage";
import type { Documento, UsuarioPublico, TipoArchivo, EstadoDocumento, Confidencialidad } from "@/types";

// ============================================================
//  SERVICIO DE DOCUMENTOS — capa de negocio (Prisma / Supabase).
//  Los controladores llaman aquí; aquí se aplican permisos y
//  reglas. Los datos viven en la base real.
// ============================================================

const asDocs = (rows: unknown): Documento[] => rows as Documento[];

/** Quita campos internos (storagePath, mime) antes de exponer al cliente. */
function limpiar(doc: unknown): Documento {
  const { storagePath, mime, ...pub } = doc as Record<string, unknown>;
  return pub as unknown as Documento;
}
const limpiarLista = (docs: Documento[]): Documento[] => docs.map(limpiar);

/** ID único (evita colisiones por milisegundo). */
function nuevoId(prefijo: string): string {
  return `${prefijo}-${randomUUID().slice(0, 12)}`;
}

/** Todos los documentos (sin filtrar por permiso). */
async function todos(): Promise<Documento[]> {
  return asDocs(await prisma.documento.findMany());
}

export interface FiltrosDocumento {
  categoria?: string;
  subareaSlug?: string;
  estado?: string;
  busqueda?: string;
}

/** Lista los documentos de un área que el usuario puede ver, con filtros. */
export async function listarDocumentosDeArea(
  user: UsuarioPublico,
  areaSlug: string,
  filtros: FiltrosDocumento = {},
): Promise<Documento[]> {
  const rows = asDocs(await prisma.documento.findMany({ where: { areaSlug } }));
  let docs = documentosVisibles(user, rows); // ← permisos primero

  if (filtros.categoria && filtros.categoria !== "todos") {
    docs = docs.filter((d) => d.categoria === filtros.categoria);
  }
  if (filtros.subareaSlug && filtros.subareaSlug !== "todos") {
    docs = docs.filter((d) => d.subareaSlug === filtros.subareaSlug);
  }
  if (filtros.estado && filtros.estado !== "todos") {
    docs = docs.filter((d) => d.estado === filtros.estado);
  }
  if (filtros.busqueda) {
    const q = filtros.busqueda.toLowerCase();
    docs = docs.filter((d) => d.nombre.toLowerCase().includes(q));
  }

  return limpiarLista(docs.sort((a, b) => +new Date(b.fechaSubida) - +new Date(a.fechaSubida)));
}

/** Todos los documentos visibles para el usuario (para dashboard/conteos). */
export async function documentosVisiblesTodos(user: UsuarioPublico): Promise<Documento[]> {
  return documentosVisibles(user, await todos());
}

/** Documentos recientes visibles para el dashboard. */
export async function documentosRecientes(
  user: UsuarioPublico,
  limite = 6,
): Promise<Documento[]> {
  return documentosVisibles(user, await todos())
    .sort((a, b) => +new Date(b.fechaSubida) - +new Date(a.fechaSubida))
    .slice(0, limite);
}

/** Búsqueda global (barra superior). Busca en nombre, autor y categoría. */
export async function buscarGlobal(
  user: UsuarioPublico,
  query: string,
): Promise<Documento[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return documentosVisibles(user, await todos())
    .filter((d) =>
      `${d.nombre} ${d.autor} ${d.categoria}`.toLowerCase().includes(q),
    )
    .slice(0, 10)
    .map(limpiar);
}

/** Documentos de un proyecto (de todas las áreas) que el usuario puede ver. */
export async function listarDocumentosDeProyecto(
  user: UsuarioPublico,
  proyectoSlug: string,
): Promise<Documento[]> {
  const rows = asDocs(await prisma.documento.findMany({ where: { proyectoSlug } }));
  return limpiarLista(
    documentosVisibles(user, rows).sort(
      (a, b) => +new Date(b.fechaSubida) - +new Date(a.fechaSubida),
    ),
  );
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
  contenidoBase64?: string | null; // contenido del archivo
  mime?: string | null;
  soloVista?: boolean;
}

/** Registra un documento nuevo (valida permiso de subida). */
export async function crearDocumento(
  user: UsuarioPublico,
  data: NuevoDocumento,
): Promise<Documento> {
  if (!puedeSubir(user, data.areaSlug)) {
    throw new Error("No tiene permiso para subir documentos a esta área.");
  }
  const id = nuevoId("d");
  const mime = data.mime || "application/octet-stream";

  // Sube el archivo a Supabase Storage (si vino contenido).
  let storagePath: string | null = null;
  if (data.contenidoBase64) {
    storagePath = `${data.areaSlug}/${id}`;
    await subirArchivo(storagePath, Buffer.from(data.contenidoBase64, "base64"), mime);
  }

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
      estado: "revision", // todo documento nuevo entra en revisión
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
}

type DocConArchivo = Documento & { storagePath?: string | null; mime?: string | null; soloVista?: boolean };

/** URL firmada para DESCARGAR el archivo (bloquea si es "solo vista"). */
export async function obtenerUrlDescarga(
  user: UsuarioPublico,
  id: string,
): Promise<{ url: string; nombre: string; areaSlug: string } | null> {
  const doc = asDocs(await prisma.documento.findMany({ where: { id } }))[0] as DocConArchivo | undefined;
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
  const doc = asDocs(await prisma.documento.findMany({ where: { id } }))[0] as DocConArchivo | undefined;
  if (!doc) return null;
  if (!puedeVerDocumento(user, doc)) throw new Error("Sin permiso para ver este documento.");
  if (!doc.storagePath) return null;
  const buffer = await descargarArchivo(doc.storagePath);
  if (!buffer) return null;
  return { buffer, mime: doc.mime || "application/octet-stream", nombre: doc.nombre };
}

/** Edita estado y/o confidencialidad de un documento. */
export async function actualizarDocumento(
  user: UsuarioPublico,
  id: string,
  cambios: { estado?: EstadoDocumento; confidencialidad?: Confidencialidad },
): Promise<Documento> {
  const doc = asDocs(await prisma.documento.findMany({ where: { id } }))[0];
  if (!doc) throw new Error("Documento no encontrado.");
  if (!puedeEditarDocumento(user, doc)) throw new Error("Sin permiso para editar este documento.");
  const actualizado = await prisma.documento.update({
    where: { id },
    data: {
      estado: cambios.estado ?? doc.estado,
      confidencialidad: cambios.confidencialidad ?? doc.confidencialidad,
    },
  });
  return limpiar(actualizado);
}

/** Elimina un documento (y su archivo en Storage). Devuelve nombre y área. */
export async function eliminarDocumento(
  user: UsuarioPublico,
  id: string,
): Promise<{ nombre: string; areaSlug: string }> {
  const doc = asDocs(await prisma.documento.findMany({ where: { id } }))[0] as
    | (Documento & { storagePath?: string | null })
    | undefined;
  if (!doc) throw new Error("Documento no encontrado.");
  if (!puedeEliminarDocumento(user, doc)) throw new Error("Sin permiso para eliminar este documento.");
  // Borra el archivo actual y los de todas las versiones anteriores.
  const versiones = await prisma.documentoVersion.findMany({ where: { documentoId: id }, select: { storagePath: true } });
  const rutas = [doc.storagePath, ...versiones.map((v) => v.storagePath)].filter(Boolean) as string[];
  for (const ruta of rutas) {
    try { await borrarArchivo(ruta); } catch { /* si falla el storage, igual borramos el registro */ }
  }
  await prisma.documentoVersion.deleteMany({ where: { documentoId: id } });
  await prisma.documento.delete({ where: { id } });
  return { nombre: doc.nombre, areaSlug: doc.areaSlug };
}

// ============================================================
//  VERSIONADO — cada reemplazo archiva la versión anterior.
// ============================================================

/** Sube una nueva versión: archiva la actual y sube la nueva. */
export async function reemplazarArchivo(
  user: UsuarioPublico,
  id: string,
  data: { contenidoBase64: string; mime?: string | null; tamano: string },
): Promise<Documento> {
  const doc = asDocs(await prisma.documento.findMany({ where: { id } }))[0] as DocConArchivo | undefined;
  if (!doc) throw new Error("Documento no encontrado.");
  if (!puedeEditarDocumento(user, doc)) throw new Error("Sin permiso para editar este documento.");
  if (!data.contenidoBase64) throw new Error("Falta el archivo de la nueva versión.");

  const mime = data.mime || "application/octet-stream";

  // Archiva la versión actual (si tiene archivo).
  if (doc.storagePath) {
    await prisma.documentoVersion.create({
      data: {
        documentoId: id,
        version: doc.version,
        storagePath: doc.storagePath,
        mime: doc.mime ?? "application/octet-stream",
        tamano: doc.tamano,
        autor: doc.autor,
        fecha: doc.fechaSubida,
      },
    });
  }

  const n = (parseInt(doc.version, 10) || 1) + 1;
  const nuevaVersion = `${n}.0`;
  const nuevoPath = `${doc.areaSlug}/${id}-v${n}`;
  await subirArchivo(nuevoPath, Buffer.from(data.contenidoBase64, "base64"), mime);

  const actualizado = await prisma.documento.update({
    where: { id },
    data: {
      storagePath: nuevoPath,
      mime,
      tamano: data.tamano || doc.tamano,
      version: nuevaVersion,
      fechaSubida: new Date().toISOString(),
      autor: user.nombre,
    },
  });
  return limpiar(actualizado);
}

export interface VersionInfo {
  id: string; version: string; tamano: string; autor: string; fecha: string;
}

/** Lista el historial de versiones anteriores de un documento. */
export async function listarVersiones(user: UsuarioPublico, id: string): Promise<VersionInfo[]> {
  const doc = asDocs(await prisma.documento.findMany({ where: { id } }))[0];
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
  const doc = asDocs(await prisma.documento.findMany({ where: { id } }))[0] as DocConArchivo | undefined;
  if (!doc) return null;
  if (!puedeVerDocumento(user, doc)) throw new Error("Sin permiso para ver este documento.");
  if (doc.soloVista) throw new Error("Este documento es solo de vista previa; no se puede descargar.");
  const v = await prisma.documentoVersion.findUnique({ where: { id: versionId } });
  if (!v || v.documentoId !== id) return null;
  return urlFirmada(v.storagePath, `${doc.nombre} (v${v.version})`);
}
