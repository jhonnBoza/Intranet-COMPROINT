import { PrismaClient } from "@prisma/client";

// Cliente Prisma como singleton (evita múltiples conexiones en dev con HMR).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
