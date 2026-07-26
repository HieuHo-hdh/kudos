import { createContext, useContext, type ReactNode } from "react"
import type { Socket } from "socket.io-client"

const SocketContext = createContext<Socket | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  // Filled in Task 9.
  return (
    <SocketContext.Provider value={null}>{children}</SocketContext.Provider>
  )
}

export function useSocket(): Socket | null {
  return useContext(SocketContext)
}
