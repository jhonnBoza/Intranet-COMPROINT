import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
//  Almacenamiento de archivos — Supabase Storage.
//  Los archivos ya NO viven en Postgres; van a un bucket privado.
// ============================================================

export const BUCKET = "documentos";

let _client: SupabaseClient | null = null;

/** Cliente admin (service_role). Lazy: la app corre aunque falte la key. */
function admin(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Falta configurar SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el .env.");
    }
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

/** Crea el bucket privado si no existe. */
export async function asegurarBucket(): Promise<void> {
  const { data } = await admin().storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await admin().storage.createBucket(BUCKET, { public: false });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

/** Sube un archivo (Buffer) al bucket. */
export async function subirArchivo(path: string, contenido: Buffer, mime: string): Promise<void> {
  await asegurarBucket();
  const { error } = await admin().storage.from(BUCKET).upload(path, contenido, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);
}

/** Descarga los bytes de un archivo desde el bucket (para vista previa). */
export async function descargarArchivo(path: string): Promise<Buffer | null> {
  const { data, error } = await admin().storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Genera una URL firmada temporal (5 min). download opcional fuerza descarga. */
export async function urlFirmada(path: string, download?: string): Promise<string | null> {
  const { data, error } = await admin()
    .storage.from(BUCKET)
    .createSignedUrl(path, 300, download ? { download } : undefined);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Elimina un archivo del bucket. */
export async function borrarArchivo(path: string): Promise<void> {
  await admin().storage.from(BUCKET).remove([path]);
}
