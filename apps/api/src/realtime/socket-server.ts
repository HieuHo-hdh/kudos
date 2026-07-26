import type { Server as HttpServer } from "node:http"

import { env } from "@kudos/config"
import { createAdapter } from "@socket.io/redis-adapter"
import { Server } from "socket.io"

import { logger } from "../common/logger"
import { redisPub, redisSub } from "../common/redis-client"

import { registerPingHandler } from "./ping.handler"
import { feedRoom, userRoom } from "./rooms"
import { authenticateSocket } from "./socket-auth"

export function attachSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    adapter: createAdapter(redisPub, redisSub),
  })

  io.use(async (socket, next) => {
    const auth = await authenticateSocket(socket)
    if (!auth) return next(new Error("unauthorized"))
    socket.data.userId = auth.userId
    socket.data.role = auth.role
    next()
  })

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string
    await socket.join([userRoom(userId), feedRoom])
    socket.emit("connection:established", { userId })
    registerPingHandler(socket, userId)

    logger.info({ userId, socketId: socket.id }, "socket connected")
    socket.on("disconnect", (reason) => {
      logger.info(
        { userId, socketId: socket.id, reason },
        "socket disconnected",
      )
    })
  })

  return io
}
