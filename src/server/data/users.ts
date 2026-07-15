import type { Usuario } from "@/types";

// ============================================================
//  Usuarios mock — representan la jerarquía de COMPROINT.
//  En producción vivirían en PostgreSQL con contraseña hasheada.
//  Contraseña de todos: "demo123"  (solo para pruebas)
// ============================================================

export const USUARIOS: Usuario[] = [
  {
    id: "u-001",
    nombre: "Carlos Mendoza",
    email: "gerente@comproint.com",
    password: "demo123",
    rol: "GERENTE_GENERAL",
    cargo: "Gerente General",
    areaSlug: null, // alcance global — ve todo
    subareaSlug: null,
    avatarColor: "#1e40af",
  },
  {
    id: "u-002",
    nombre: "Juan Pérez",
    email: "jefe.produccion@comproint.com",
    password: "demo123",
    rol: "JEFE_AREA",
    cargo: "Jefe de Producción",
    areaSlug: "produccion",
    subareaSlug: null,
    avatarColor: "#0f766e",
  },
  {
    id: "u-003",
    nombre: "María Torres",
    email: "jefe.calidad@comproint.com",
    password: "demo123",
    rol: "JEFE_AREA",
    cargo: "Jefa de Calidad",
    areaSlug: "calidad",
    subareaSlug: null,
    avatarColor: "#7c3aed",
  },
  {
    id: "u-004",
    nombre: "Roberto Díaz",
    email: "inspector.qa@comproint.com",
    password: "demo123",
    rol: "SUPERVISOR",
    cargo: "Inspector QA/QC",
    areaSlug: "calidad",
    subareaSlug: "qa-qc",
    avatarColor: "#c2410c",
  },
  {
    id: "u-005",
    nombre: "Luis Ramírez",
    email: "soldador@comproint.com",
    password: "demo123",
    rol: "OPERARIO",
    cargo: "Soldador",
    areaSlug: "produccion",
    subareaSlug: "registros",
    avatarColor: "#475569",
  },
];

export function findUserByEmail(email: string): Usuario | undefined {
  return USUARIOS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): Usuario | undefined {
  return USUARIOS.find((u) => u.id === id);
}
