import { createServer } from "node:http"

import { env } from "@kudos/config"

import { createApp } from "./app"
import { logger } from "./common/logger"

const app = createApp()
const httpServer = createServer(app)

httpServer.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`)
})

const shutdown = (signal: string) => {
  logger.info(`${signal} received — shutting down`)
  httpServer.close(() => {
    logger.info("HTTP server closed")
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
