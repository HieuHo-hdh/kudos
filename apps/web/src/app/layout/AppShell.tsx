import { LogoutOutlined, MenuOutlined, UserOutlined } from "@ant-design/icons"
import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  type MenuProps,
  Typography,
} from "antd"
import { useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"

import { apiFetch } from "../../common/api/client"
import { useCurrentUser } from "../../common/hooks/useCurrentUser"

const { Header, Content } = Layout

type NavItem = { key: string; label: string; adminOnly?: boolean }

const NAV_ITEMS: NavItem[] = [
  { key: "/", label: "Home" },
  { key: "/feed", label: "Feed" },
  { key: "/give", label: "Give Kudos" },
  { key: "/rewards", label: "Rewards" },
  { key: "/admin/users", label: "Manage Users", adminOnly: true },
]

export function AppShell() {
  const { data: me } = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const screens = Grid.useBreakpoint()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isAdmin = me?.role === "ADMIN"
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin)
  const menuItems: MenuProps["items"] = items.map((i) => ({
    key: i.key,
    label: <Link to={i.key}>{i.label}</Link>,
  }))

  const handleLogout = async () => {
    await apiFetch("/auth/logout", { method: "POST" })
    navigate("/login", { replace: true })
    window.location.reload()
  }

  const userDropdownItems: MenuProps["items"] = me
    ? [
        {
          key: "greeting",
          label: <span className="font-medium">Hi, {me.displayName}</span>,
          disabled: true,
        },
        {
          key: "budget",
          label: (
            <span className="text-gray-500">
              {me.givingBudgetRemaining} to give · {me.earnedBalance} earned
            </span>
          ),
          disabled: true,
        },
        { type: "divider" },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "Log out",
          onClick: handleLogout,
        },
      ]
    : []

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header className="!bg-white !px-4 md:!px-6 flex justify-between items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {!screens.md && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            />
          )}
          <Link to="/" className="text-inherit no-underline shrink-0">
            <Typography.Title level={4} className="!m-0">
              Kudos
            </Typography.Title>
          </Link>
          {screens.md && (
            <Menu
              mode="horizontal"
              selectedKeys={[location.pathname]}
              items={menuItems}
              className="!border-b-0 !bg-transparent min-w-0 flex-1 flex items-center justify-center"
            />
          )}
        </div>
        {me && (
          <Dropdown
            menu={{ items: userDropdownItems }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button
              type="text"
              className="!px-2 flex items-center gap-2 !h-auto"
            >
              <Avatar
                size="small"
                src={me.avatarUrl ?? undefined}
                icon={<UserOutlined />}
              />
              {screens.sm && <span>{me.displayName}</span>}
            </Button>
          </Dropdown>
        )}
      </Header>
      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Menu"
        width={280}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={() => setDrawerOpen(false)}
          className="!border-r-0"
        />
      </Drawer>
      <Content className="p-6">
        <Outlet />
      </Content>
    </Layout>
  )
}
