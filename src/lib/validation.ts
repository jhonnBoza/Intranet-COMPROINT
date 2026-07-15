import { z } from "zod";

// ============================================================
//  VALIDACIÓN — esquemas zod para los payloads de las rutas API.
//  Se ejecutan antes de llamar a los servicios, para rechazar
//  datos inválidos con un 400 claro.
// ============================================================

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

/** POST /api/documents — registra un documento nuevo. */
export const documentoNuevoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  categoria: categoriaDocumentoSchema,
  areaSlug: z.string().min(1, "El área es obligatoria"),
  subareaSlug: z.string().min(1).nullish(),
  confidencialidad: confidencialidadSchema,
  tamano: z.string().nullish(),
  proyectoSlug: z.string().min(1).nullish(),
  contenidoBase64: z.string().nullish(),
  mime: z.string().nullish(),
  soloVista: z.boolean().nullish(),
});

/** PATCH /api/documents/[id] — edita estado y/o confidencialidad. */
export const documentoEdicionSchema = z
  .object({
    estado: estadoDocumentoSchema.optional(),
    confidencialidad: confidencialidadSchema.optional(),
  })
  .refine((d) => d.estado !== undefined || d.confidencialidad !== undefined, {
    message: "Debes indicar al menos un campo para editar (estado o confidencialidad).",
  });

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
