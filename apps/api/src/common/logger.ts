import { env } from "@kudos/config"
import { pino } from "pino"


import { getRequestContext } from "./request-context"

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  formatters: {
    log: (obj) => {
      const ctx = getRequestContext()
      return ctx ? { ...obj, correlationId: ctx.correlationId } : obj
    },
  },
  redact: {
    paths: [
      "password",
      "passwordHash",
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
    ],
    censor: "[REDACTED]",
  },
})
