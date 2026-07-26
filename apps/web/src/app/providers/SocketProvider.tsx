import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { io, type Socket } from "socket.io-client"

import { useCurrentUser } from "../../common/hooks/useCurrentUser"

const SocketContext = createContext<Socket | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: me } = useCurrentUser()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!me) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      return
    }
    const s = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
    })
    setSocket(s)
    return () => {
      s.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id])

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}

export function useSocket(): Socket | null {
  return useContext(SocketContext)
}
