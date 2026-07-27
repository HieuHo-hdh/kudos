import { Button, Space, Spin, Typography } from "antd"
import { useEffect, useState, type ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { useCurrentUser } from "../common/hooks/useCurrentUser"
import { useSocket } from "../common/hooks/useSocket"
import { LoginPage, RegisterPage } from "../features/auth"
import { KudosPage, GiveKudosPage } from "../features/kudos"
import { RedeemRewardsPage } from "../features/redeem-rewards"
import { ManageRewardsPage, ManageRedemptionsPage } from "../features/rewards"
import { ManageUsersPage } from "../features/user"

import { AppShell } from "./layout/AppShell"
import { AuthLayout } from "./layout/AuthLayout"

function Protected({ children }: { children: ReactNode }) {
  const { data, isLoading } = useCurrentUser()
  if (isLoading) return <Spin fullscreen />
  if (!data) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AlreadyAuthed({ children }: { children: ReactNode }) {
  const { data, isLoading } = useCurrentUser()
  if (isLoading) return <Spin fullscreen />
  if (data) return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { data, isLoading } = useCurrentUser()
  if (isLoading) return <Spin fullscreen />
  if (data?.role !== "ADMIN") return <Navigate to="/" replace />
  return <>{children}</>
}

function HomePlaceholder() {
  const socket = useSocket()
  const [status, setStatus] = useState<string>("connecting…")
  const [lastPong, setLastPong] = useState<string | null>(null)

  useEffect(() => {
    if (!socket) return
    const onConnect = () => setStatus("connected")
    const onDisconnect = () => setStatus("disconnected")
    const onEstablished = (payload: { userId: string }) =>
      setStatus(`connected as ${payload.userId}`)
    const onPong = (payload: { clientTs: number; serverTs: number }) =>
      setLastPong(
        `Round trip: ${Date.now() - payload.clientTs}ms (server ${payload.serverTs})`,
      )

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("connection:established", onEstablished)
    socket.on("pong", onPong)

    if (socket.connected) onConnect()
    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("connection:established", onEstablished)
      socket.off("pong", onPong)
    }
  }, [socket])

  return (
    <Space direction="vertical" size="middle">
      <Typography.Title level={4}>Welcome</Typography.Title>
      <div>
        Socket status: <b>{status}</b>
      </div>
      <Button
        type="primary"
        disabled={!socket}
        onClick={() => socket?.emit("ping", { clientTs: Date.now() })}
      >
        Ping server
      </Button>
      {lastPong && <div>{lastPong}</div>}
      <Typography.Text type="secondary">
        Feed lands in Sprint 2.
      </Typography.Text>
    </Space>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <AlreadyAuthed>
            <AuthLayout />
          </AlreadyAuthed>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="/" element={<HomePlaceholder />} />
        <Route path="/kudos" element={<KudosPage />} />
        <Route path="/give-kudos" element={<GiveKudosPage />} />
        <Route path="/redeem-rewards" element={<RedeemRewardsPage />} />
        <Route
          path="/admin/users"
          element={
            <AdminOnly>
              <ManageUsersPage />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/rewards"
          element={
            <AdminOnly>
              <ManageRewardsPage />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/redemptions"
          element={
            <AdminOnly>
              <ManageRedemptionsPage />
            </AdminOnly>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
