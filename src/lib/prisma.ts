import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client/index";

const defaultDevelopmentDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/shipforge";
const connectionString =
  process.env.DATABASE_URL?.trim() || defaultDevelopmentDatabaseUrl;
const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Enable detailed query logging only in development so that production logs
 * are not flooded with SQL statements (performance + security concern).
 */
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
