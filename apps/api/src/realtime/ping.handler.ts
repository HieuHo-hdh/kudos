import { SocketEvents } from "@kudos/shared"
import type { Socket } from "socket.io"


export function registerPingHandler(socket: Socket, userId: string) {
  socket.on("ping", (payload) => {
    const parsed = SocketEvents.PingEventSchema.safeParse(payload)
    if (!parsed.success) return
    socket.emit("pong", {
      clientTs: parsed.data.clientTs,
      serverTs: Date.now(),
      userId,
    })
  })
}
