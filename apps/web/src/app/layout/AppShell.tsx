import { Button, Layout, Space, Typography } from "antd"
import { Outlet, useNavigate } from "react-router-dom"

import { apiFetch } from "../../common/api/client"
import { useCurrentUser } from "../../common/hooks/useCurrentUser"

const { Header, Content } = Layout

export function AppShell() {
  const { data: me } = useCurrentUser()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await apiFetch("/auth/logout", { method: "POST" })
    navigate("/login", { replace: true })
    window.location.reload()
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Kudos
        </Typography.Title>
        <Space>
          {me && (
            <>
              <span>Hi, {me.displayName}</span>
              <span style={{ color: "#666" }}>
                {me.givingBudgetRemaining} to give · {me.earnedBalance} earned
              </span>
              <Button onClick={handleLogout}>Log out</Button>
            </>
          )}
        </Space>
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
