import "dotenv/config";

import { defineConfig } from "@prisma/config";

const defaultDevelopmentDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/shipforge";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL?.trim() || defaultDevelopmentDatabaseUrl,
  },
});