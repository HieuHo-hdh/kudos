import { Spin } from "antd"
import type { ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { useCurrentUser } from "../common/hooks/useCurrentUser"
import { LoginPage } from "../features/auth/LoginPage"
import { RegisterPage } from "../features/auth/RegisterPage"

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
        <Route path="/" element={<div>Welcome. Feed lands in Sprint 2.</div>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
