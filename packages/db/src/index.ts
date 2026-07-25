// Prisma client is generated in Task 4 after schema is written.
// This module re-exports the singleton once available.
export * from "@prisma/client"

import { PrismaClient } from "@prisma/client"

declare global {
  var __prisma: PrismaClient | undefined
}

export const db: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db
}
