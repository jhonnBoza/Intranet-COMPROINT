# Intranet Azoler — Gestión Documental Corporativa

Intranet para una empresa del sector industrial. Gestión, almacenamiento y
consulta de documentación interna, organizada por **áreas** y **jerarquías**,
con control de acceso por rol y confidencialidad.

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 14** (App Router) |
| Lenguaje | **TypeScript** |
| Estilos | **Tailwind CSS** |
| Iconos | lucide-react |
| Datos | **Mock en memoria** (listo para migrar a PostgreSQL) |

## Arquitectura

Monolito modular con **arquitectura por capas**:

```
Petición (page.tsx / route.ts)   ← Controlador
        ↓
src/server/services/*.service.ts ← Lógica de negocio
        ↓
src/lib/permissions.ts           ← Reglas de permisos (núcleo)
        ↓
src/server/data/*.ts             ← Repositorio de datos (mock)
```

**Regla de oro:** toda decisión de permiso vive en `src/lib/permissions.ts`,
nunca en los componentes ni pegada a los datos.

### Estructura de carpetas

```
src/
├── app/
│   ├── login/                 Pantalla de login
│   ├── (app)/                 Páginas protegidas (exigen sesión)
│   │   ├── dashboard/         Inicio: accesos rápidos, recientes, anuncios
│   │   └── area/[slug]/       Repositorio documental por área
│   └── api/                   Endpoints: auth, documents
├── components/                Sistema de componentes reutilizables
│   ├── Sidebar / Navbar       Navegación
│   ├── DocumentTable...       Tabla + filas
│   ├── UploadModal            Modal de subida (drag & drop)
│   ├── FileIcon / StatusBadge Iconos de tipo y badges de estado
├── lib/
│   ├── permissions.ts         ← CORAZÓN: matriz de permisos jerárquicos
│   ├── session.ts             Sesión por cookie
│   └── format.ts              Utilidades de fecha
├── server/
│   ├── data/                  Datos mock (areas, users, documents)
│   └── services/              Capa de negocio
└── types/                     Tipos del dominio
```

## Cómo correr

```bash
npm install
npm run dev      # http://localhost:3000
```

## Cuentas de prueba (contraseña: `demo123`)

| Correo | Rol | Alcance |
|--------|-----|---------|
| gerente@azoler.com | Gerente General | **Todas** las áreas |
| jefe.produccion@azoler.com | Jefe de Área | Solo Producción |
| inspector.qa@azoler.com | Supervisor | Sub-área QA/QC de Calidad |
| soldador@azoler.com | Operario | Solo lectura de Producción |

## Matriz de permisos

| Rol | Ver | Descargar | Subir | Editar/Aprobar | Eliminar |
|-----|-----|-----------|-------|----------------|----------|
| Gerente General | Todo | ✅ | ✅ | ✅ | ✅ |
| Jefe de Área | Su área | ✅ | ✅ | ✅ (su área) | ✅ (su área) |
| Supervisor | Su sub-área | ✅ | ✅ | ⚠️ solo "en revisión" | ❌ |
| Operario | Público de su área | ✅ | ❌ | ❌ | ❌ |

Además, cada documento tiene **confidencialidad**: `público` (toda el área),
`solo jefes`, `restringido` (solo gerencia).

## Próximo paso: migrar a base de datos real

El código está listo para cambiar los datos mock por PostgreSQL **sin tocar la UI**:

1. Instalar Prisma: `npm i prisma @prisma/client`
2. Definir el esquema (`usuarios`, `areas`, `documentos`, `versiones`, `auditoria`)
   a partir de los tipos en `src/types/index.ts`.
3. Reemplazar las funciones de `src/server/data/*.ts` por consultas Prisma.
4. Cambiar el almacenamiento de archivos a MinIO/S3 (hoy solo se guarda metadata).
5. Hashear contraseñas con bcrypt/argon2 en `auth.service`.

Los servicios y la capa de permisos **no cambian**.
