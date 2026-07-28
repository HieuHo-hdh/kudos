import { Spin } from "antd"
import { type ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { useCurrentUser } from "../common/hooks/useCurrentUser"
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
        <Route path="/" element={<Navigate to="/kudos" replace />} />
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
