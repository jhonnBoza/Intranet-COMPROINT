import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AREAS } from "../src/server/data/areas";
import { USUARIOS } from "../src/server/data/users";
import { DOCUMENTOS, ANUNCIOS } from "../src/server/data/documents";
import { PROYECTOS } from "../src/server/data/projects";

// Carga los datos iniciales (mock) a la base de datos real.
// Idempotente: usa upsert, se puede correr varias veces.

const prisma = new PrismaClient();

async function main() {
  console.log("→ Áreas y sub-áreas…");
  for (const a of AREAS) {
    await prisma.area.upsert({
      where: { slug: a.slug },
      update: { nombre: a.nombre, descripcion: a.descripcion, icono: a.icono },
      create: { slug: a.slug, nombre: a.nombre, descripcion: a.descripcion, icono: a.icono },
    });
    for (const sa of a.subareas) {
      await prisma.subArea.upsert({
        where: { areaSlug_slug: { areaSlug: a.slug, slug: sa.slug } },
        update: { nombre: sa.nombre },
        create: { areaSlug: a.slug, slug: sa.slug, nombre: sa.nombre },
      });
    }
  }

  console.log("→ Usuarios (con contraseñas hasheadas)…");
  for (const u of USUARIOS) {
    const password = await bcrypt.hash(u.password, 10);
    const data = { ...u, password, activo: true };
    await prisma.usuario.upsert({ where: { id: u.id }, update: data, create: data });
  }

  console.log("→ Proyectos…");
  for (const p of PROYECTOS) {
    await prisma.proyecto.upsert({ where: { slug: p.slug }, update: p, create: p });
  }

  console.log("→ Documentos…");
  for (const d of DOCUMENTOS) {
    const data = { ...d, proyectoSlug: d.proyectoSlug ?? null };
    await prisma.documento.upsert({ where: { id: d.id }, update: data, create: data });
  }

  console.log("→ Anuncios…");
  for (const an of ANUNCIOS) {
    await prisma.anuncio.upsert({ where: { id: an.id }, update: an, create: an });
  }

  const [areas, usuarios, docs, proys, anuncios] = await Promise.all([
    prisma.area.count(), prisma.usuario.count(), prisma.documento.count(),
    prisma.proyecto.count(), prisma.anuncio.count(),
  ]);
  console.log(`✓ Listo: ${areas} áreas, ${usuarios} usuarios, ${docs} documentos, ${proys} proyectos, ${anuncios} anuncios.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
