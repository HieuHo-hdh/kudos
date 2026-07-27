import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"

import { useCurrentUser } from "./useCurrentUser"

let socketInstance: Socket | null = null

export function useSocket(): Socket | null {
  const { data: user } = useCurrentUser()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!user) return

    // Only create one socket instance per app
    if (!socketInstance) {
      socketInstance = io(window.location.origin, {
        auth: {
          userId: user.id,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      })

      socketInstance.on("connection:established", () => {})

      socketInstance.on("disconnect", () => {})

      socketInstance.on("error", (error) => {
        console.error("Socket error:", error)
      })
    }

    socketRef.current = socketInstance

    return () => {
      // Don't disconnect on unmount - keep connection alive
    }
  }, [user])

  return socketRef.current
}
