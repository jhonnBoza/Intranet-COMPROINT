import { z } from "zod";

// ============================================================
//  VALIDACIÓN — esquemas zod para los payloads de las rutas API.
//  Se ejecutan antes de llamar a los servicios, para rechazar
//  datos inválidos con un 400 claro.
// ============================================================

// ---- Límite de tamaño de archivo ---------------------------------------

/** Tamaño máximo de archivo permitido en subidas (25 MB). */
export const MAX_ARCHIVO_BYTES = 25 * 1024 * 1024;

/**
 * Estima los bytes reales de un contenido base64 y devuelve un error si excede
 * el límite. Devuelve null si está dentro del límite o si no hay contenido.
 */
export function excedeLimiteArchivo(base64: string | null | undefined): string | null {
  if (!base64) return null;
  // Cada 4 chars de base64 ≈ 3 bytes (descontando el padding "=").
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((base64.length * 3) / 4) - padding;
  if (bytes > MAX_ARCHIVO_BYTES) {
    const mb = (MAX_ARCHIVO_BYTES / 1024 / 1024).toFixed(0);
    return `El archivo supera el límite de ${mb} MB.`;
  }
  return null;
}

/** Ejecuta un esquema zod contra datos desconocidos (ej. body de un request). */
export function validar<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error.issues[0]?.message ?? "Datos inválidos." };
}

// ---- Enums compartidos -------------------------------------------------

export const rolSchema = z.enum(["GERENTE_GENERAL", "JEFE_AREA", "SUPERVISOR", "OPERARIO"], {
  message: "Rol inválido.",
});

export const estadoDocumentoSchema = z.enum(["vigente", "revision", "obsoleto"], {
  message: "Estado de documento inválido.",
});

export const confidencialidadSchema = z.enum(["publico", "jefes", "restringido"], {
  message: "Nivel de confidencialidad inválido.",
});

export const prioridadSchema = z.enum(["alta", "normal"], {
  message: "Prioridad inválida.",
});

export const estadoProyectoSchema = z.enum(["en-curso", "cerrado"], {
  message: "Estado de proyecto inválido.",
});

export const categoriaDocumentoSchema = z.enum(
  ["Procedimiento", "Formato", "Manual", "Registro", "Plano", "Reporte"],
  { message: "Categoría de documento inválida." },
);

// ---- Documentos ----------------------------------------------------------

/**
 * Extensiones de archivo permitidas. Bloquea .html/.svg/.js/.htm que podrían
 * ejecutar script si se abren directamente (defensa en profundidad; al servir
 * también se fuerza un Content-Type seguro).
 */
export const EXTENSIONES_OK = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|dwg|png|jpe?g|gif|webp|txt|csv)$/i;

/** Un slug (subárea/proyecto) que acepta "" como null (cuando no hay carpetas). */
const slugOpcional = z
  .string()
  .transform((s) => (s.trim() === "" ? null : s.trim()))
  .nullish();

/** POST /api/documents — registra un documento nuevo. */
export const documentoNuevoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").regex(EXTENSIONES_OK, "Tipo de archivo no permitido."),
  categoria: categoriaDocumentoSchema,
  areaSlug: z.string().min(1, "El área es obligatoria"),
  subareaSlug: slugOpcional,
  confidencialidad: confidencialidadSchema,
  tamano: z.string().nullish(),
  proyectoSlug: slugOpcional,
  storagePath: z.string().min(1).nullish(),   // subida directa
  contenidoBase64: z.string().nullish(),        // subida legacy
  mime: z.string().nullish(),
  soloVista: z.boolean().nullish(),
});

/** POST /api/documents/upload-url — pide una URL firmada de subida directa. */
export const urlSubidaSchema = z.object({
  areaSlug: z.string().min(1, "El área es obligatoria"),
});

/** PATCH /api/documents/[id] — edita metadatos del documento. */
export const documentoEdicionSchema = z
  .object({
    estado: estadoDocumentoSchema.optional(),
    confidencialidad: confidencialidadSchema.optional(),
    nombre: z.string().min(1).regex(EXTENSIONES_OK, "Tipo de archivo no permitido.").optional(),
    categoria: categoriaDocumentoSchema.optional(),
    subareaSlug: slugOpcional,
    proyectoSlug: slugOpcional,
  })
  .refine(
    (d) =>
      d.estado !== undefined ||
      d.confidencialidad !== undefined ||
      d.nombre !== undefined ||
      d.categoria !== undefined ||
      d.subareaSlug !== undefined ||
      d.proyectoSlug !== undefined,
    { message: "Debes indicar al menos un campo para editar." },
  );

// ---- Proyectos -------------------------------------------------------------

/** POST /api/projects — crea un proyecto nuevo. */
export const proyectoNuevoSchema = z.object({
  nombre: z.string().min(1, "El nombre del proyecto es obligatorio"),
  descripcion: z.string().nullish(),
  estado: estadoProyectoSchema.optional(),
});

// ---- Sub-áreas ---------------------------------------------------------

/** POST /api/subareas — crea una carpeta (sub-área) en un área. */
export const subareaNuevaSchema = z.object({
  areaSlug: z.string().min(1, "El área es obligatoria"),
  nombre: z.string().min(1, "El nombre de la carpeta es obligatorio"),
});

// ---- Anuncios --------------------------------------------------------------

/** POST /api/announcements — publica un anuncio corporativo. */
export const anuncioNuevoSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio"),
  cuerpo: z.string().min(1, "El cuerpo del anuncio es obligatorio"),
  prioridad: prioridadSchema.optional(),
});

// ---- Usuarios --------------------------------------------------------------

/** POST /api/users — crea un usuario nuevo. */
export const usuarioNuevoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().min(1, "El correo es obligatorio").email("El correo no es válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: rolSchema,
  cargo: z.string().optional(),
  areaSlug: z.string().min(1).nullish(),
});

/** PATCH /api/users/[id] — edita un usuario existente. */
export const usuarioEdicionSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").optional(),
  rol: rolSchema.optional(),
  cargo: z.string().optional(),
  areaSlug: z.string().nullish(),
  activo: z.boolean().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
});
