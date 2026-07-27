import { ClearOutlined, MoreOutlined, ReloadOutlined } from "@ant-design/icons"
import type { ListUsersQuery, UpdateUserInput, UserDetail } from "@kudos/shared"
import { App, Button, Card, Dropdown, Select, Space, Table, Tag } from "antd"
import { useState } from "react"

import { DebouncedSearch } from "../../common/components/DebouncedSearch"
import { useCurrentUser } from "../../common/hooks/useCurrentUser"

import { AdminLayout } from "./AdminLayout"
import { EditUserModal } from "./EditUserModal"
import {
  useDeleteUser,
  useReactivateUser,
  useUpdateUser,
  useUsersList,
} from "./hooks/useUsers"

export function ManageUsersPage() {
  const currentUser = useCurrentUser()
  const { modal, message } = App.useApp()

  const [pagination, setPagination] = useState({ page: 1, limit: 20 })
  const [filters, setFilters] = useState<
    Partial<Pick<ListUsersQuery, "role" | "active" | "search">>
  >({})
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const query: ListUsersQuery = {
    page: pagination.page,
    limit: pagination.limit,
    ...filters,
  }

  const { data, isLoading, refetch } = useUsersList(query)
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()
  const reactivateMutation = useReactivateUser()

  const handleEdit = (user: UserDetail) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const handleEditSubmit = async (input: UpdateUserInput) => {
    if (!editingUser) return
    try {
      await updateMutation.mutateAsync({ id: editingUser.id, input })
      message.success("User updated successfully")
      setShowEditModal(false)
      setEditingUser(null)
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Failed to update user",
      )
    }
  }

  const handleDeleteClick = (user: UserDetail) => {
    if (user.id === currentUser.data?.id) {
      modal.error({
        title: "Cannot Delete Self",
        content: "You cannot delete your own account.",
      })
      return
    }

    modal.confirm({
      title: "Delete User",
      content: `Are you sure you want to delete ${user.email}? This action cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(user.id)
          message.success("User deleted successfully")
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : "Failed to delete user",
          )
        }
      },
    })
  }

  const handleReactivateClick = (user: UserDetail) => {
    modal.confirm({
      title: "Reactivate User",
      content: `Are you sure you want to reactivate ${user.email}?`,
      okText: "Reactivate",
      onOk: async () => {
        try {
          await reactivateMutation.mutateAsync(user.id)
          message.success("User reactivated successfully")
        } catch (error) {
          message.error(
            error instanceof Error
              ? error.message
              : "Failed to reactivate user",
          )
        }
      },
    })
  }

  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      sorter: (a: UserDetail, b: UserDetail) => a.email.localeCompare(b.email),
    },
    {
      title: "Display Name",
      dataIndex: "displayName",
      key: "displayName",
      width: 150,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 100,
      render: (role: string) => (
        <Tag color={role === "ADMIN" ? "blue" : "green"}>{role}</Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_: unknown, record: UserDetail) => (
        <Tag color={record.deletedAt ? "red" : "green"}>
          {record.deletedAt ? "Inactive" : "Active"}
        </Tag>
      ),
    },
    {
      title: "Giving Budget",
      dataIndex: "givingBudgetRemaining",
      key: "givingBudgetRemaining",
      width: 120,
      align: "center" as const,
    },
    {
      title: "Actions",
      key: "actions",
      width: 20,
      fixed: "right" as const,
      render: (_: unknown, record: UserDetail) => {
        const isSelf = record.id === currentUser.data?.id
        const isDeleted = !!record.deletedAt

        const menuItems = isDeleted
          ? [
              {
                key: "reactivate",
                label: "Reactivate",
                onClick: () => handleReactivateClick(record),
              },
            ]
          : [
              {
                key: "edit",
                label: "Edit",
                onClick: () => handleEdit(record),
              },
              {
                key: "delete",
                label: "Delete",
                danger: true,
                disabled: isSelf,
                onClick: () => handleDeleteClick(record),
              },
            ]

        return (
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        )
      },
    },
  ]

  return (
    <AdminLayout breadcrumbs={[{ title: "Manage Users" }]}>
      <Card>
        <Space direction="vertical" className="w-full" size="large">
          <h1 className="text-2xl font-bold">Manage Users</h1>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 flex gap-2 flex-wrap md:flex-nowrap">
              <DebouncedSearch
                placeholder="Search by email or name"
                value={filters.search || ""}
                onChange={(value) => {
                  const trimmed = value.slice(0, 50)
                  setFilters({ ...filters, search: trimmed || undefined })
                }}
                allowClear
                className="flex-wrap md:max-w-xs"
                maxLength={50}
                debounceMs={500}
              />
              <Select
                placeholder="Filter by role"
                value={filters.role || undefined}
                onChange={(value) =>
                  setFilters({ ...filters, role: value || undefined })
                }
                options={[
                  { label: "Employee", value: "EMPLOYEE" },
                  { label: "Admin", value: "ADMIN" },
                ]}
                allowClear
                className="w-40"
              />
              <Select
                placeholder="Filter by status"
                value={
                  filters.active === undefined
                    ? undefined
                    : filters.active
                      ? "active"
                      : "inactive"
                }
                onChange={(value) => {
                  if (value === "active") {
                    setFilters({ ...filters, active: true })
                  } else if (value === "inactive") {
                    setFilters({ ...filters, active: false })
                  } else {
                    setFilters({ ...filters, active: undefined })
                  }
                }}
                options={[
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ]}
                allowClear
                className="w-40"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setFilters({})
                  setPagination({ page: 1, limit: 20 })
                }}
                icon={<ClearOutlined />}
              >
                Clear Filters
              </Button>
              <Button
                onClick={() => refetch()}
                icon={<ReloadOutlined />}
                loading={isLoading}
              >
                Refresh
              </Button>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={data?.items || []}
            loading={
              isLoading ||
              updateMutation.isPending ||
              deleteMutation.isPending ||
              reactivateMutation.isPending
            }
            rowKey="id"
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: data?.total || 0,
              showTotal: (total) => `Total: ${total}`,
              onChange: (page) => setPagination((prev) => ({ ...prev, page })),
              showSizeChanger: true,
              responsive: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              onShowSizeChange: (_, pageSize) => {
                setPagination({ page: 1, limit: pageSize })
              },
            }}
            scroll={{ x: true }}
          />

          <EditUserModal
            visible={showEditModal}
            user={editingUser}
            currentUserId={currentUser.data?.id || ""}
            onClose={() => {
              setShowEditModal(false)
              setEditingUser(null)
            }}
            onSubmit={handleEditSubmit}
            isLoading={updateMutation.isPending}
          />
        </Space>
      </Card>
    </AdminLayout>
  )
}
