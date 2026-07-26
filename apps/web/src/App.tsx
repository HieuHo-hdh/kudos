import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { BrowserRouter } from "react-router-dom"

import { AntdProvider } from "./app/providers/AntdProvider"
import { QueryProvider } from "./app/providers/QueryProvider"
import { SocketProvider } from "./app/providers/SocketProvider"
import { AppRoutes } from "./app/routes"

function SessionExpiryHandler() {
  const qc = useQueryClient()
  useEffect(() => {
    const handler = () => {
      qc.clear()
    }
    window.addEventListener("session-expired", handler)
    return () => window.removeEventListener("session-expired", handler)
  }, [qc])
  return null
}

export function App() {
  return (
    <QueryProvider>
      <AntdProvider>
        <BrowserRouter>
          <SessionExpiryHandler />
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </BrowserRouter>
      </AntdProvider>
    </QueryProvider>
  )
}
