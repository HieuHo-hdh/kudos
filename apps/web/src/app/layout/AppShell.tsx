import {
  GiftOutlined,
  HeartOutlined,
  HomeOutlined,
  LikeOutlined,
  LogoutOutlined,
  MenuOutlined,
  ShopOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons"
import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  type MenuProps,
} from "antd"
import { useState } from "react"
import { useNavigate, Outlet, useLocation } from "react-router-dom"

import { apiFetch } from "../../common/api/client"
import { useCurrentUser } from "../../common/hooks/useCurrentUser"
import { NotificationsDropdown } from "../../features/notifications/components/NotificationsDropdown"

const { Sider, Header, Content } = Layout

type NavItem = {
  key: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: "/", label: "Home", icon: <HomeOutlined /> },
  { key: "/kudos", label: "Kudos Feed", icon: <LikeOutlined /> },
  { key: "/give-kudos", label: "Give Kudos", icon: <HeartOutlined /> },
  {
    key: "/redeem-rewards",
    label: "Redeem Rewards",
    icon: <GiftOutlined />,
  },
  {
    key: "/admin/users",
    label: "Manage Users",
    icon: <UserOutlined />,
    adminOnly: true,
  },
  {
    key: "/admin/rewards",
    label: "Manage Rewards",
    icon: <ShopOutlined />,
    adminOnly: true,
  },
  {
    key: "/admin/redemptions",
    label: "Manage Redemptions",
    icon: <ShoppingOutlined />,
    adminOnly: true,
  },
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
    icon: i.icon,
    label: i.label,
    onClick: () => navigate(i.key),
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
      <Header className="!bg-white !px-6 flex justify-between items-center border-b border-gray-200 gap-4">
        <div className="flex items-center gap-2">
          {!screens.md && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            />
          )}
          <div
            className="text-lg font-bold cursor-pointer"
            onClick={() => navigate("/")}
          >
            Kudos
          </div>
        </div>
        {me && (
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
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
          </div>
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
          style={{ border: "none" }}
        />
      </Drawer>

      <Layout>
        {screens.md && (
          <Sider
            style={{ background: "#ffffff" }}
            className="border-r border-gray-200"
            width={240}
          >
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              style={{ border: "none" }}
            />
          </Sider>
        )}

        <Content className="p-6 bg-gray-50">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
