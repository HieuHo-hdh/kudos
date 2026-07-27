import type { Server as HTTPServer } from "http"

import type { Socket } from "socket.io"
import { Server as SocketIOServer } from "socket.io"

export let io: SocketIOServer | null = null

export function initializeSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.WEB_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  })

  // Middleware to verify authentication
  io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId
    const userId = socket.handshake.auth.userId

    if (!userId) {
      return next(new Error("Missing user ID"))
    }

    // Store userId on socket for easy access
    socket.data.userId = userId
    socket.data.sessionId = sessionId

    next()
  })

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string

    // Join user to their own room for targeted notifications
    socket.join(`user:${userId}`)

    socket.on("disconnect", () => {})
  })

  return io
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}

// Helper function to send notification to specific user
export function notifyUser(
  userId: string,
  eventType: string,
  data: Record<string, unknown>,
) {
  if (!io) return

  io.to(`user:${userId}`).emit("notification", {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  })
}
