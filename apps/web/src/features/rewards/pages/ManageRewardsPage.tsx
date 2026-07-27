import {
  ClearOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons"
import type { CreateRewardInput, ListRewardsQuery, Reward } from "@kudos/shared"
import { App, Button, Card, Dropdown, Select, Space, Table, Tag } from "antd"
import { useState } from "react"

import { DebouncedSearch } from "../../../common/components/DebouncedSearch"
import { AdminLayout } from "../../user/components/AdminLayout"
import { EditRewardModal } from "../components/EditRewardModal"
import {
  useCreateReward,
  useDeleteReward,
  useRewardsList,
  useUpdateReward,
} from "../hooks/useRewards"

export function ManageRewardsPage() {
  const { message, modal } = App.useApp()
  const [filters, setFilters] = useState<
    Partial<Pick<ListRewardsQuery, "search" | "isActive">>
  >({})
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })
  const [showModal, setShowModal] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)

  const query: ListRewardsQuery = {
    page: pagination.page,
    limit: pagination.limit,
    ...filters,
  }

  const { data, isLoading, refetch } = useRewardsList(query)
  const { mutate: createReward, isPending: isCreating } = useCreateReward()
  const { mutate: updateReward, isPending: isUpdating } = useUpdateReward()
  const { mutate: deleteReward, isPending: isDeleting } = useDeleteReward()

  const handleOpenModal = (reward?: Reward) => {
    setEditingReward(reward || null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingReward(null)
  }

  const handleSubmit = async (values: CreateRewardInput) => {
    return new Promise<void>((resolve, reject) => {
      if (editingReward) {
        updateReward(
          { id: editingReward.id, input: values },
          {
            onSuccess: () => {
              message.success("Reward updated successfully")
              refetch()
              resolve()
            },
            onError: (error) => {
              message.error(`Failed to update reward: ${error}`)
              reject(error)
            },
          },
        )
      } else {
        createReward(values, {
          onSuccess: () => {
            message.success("Reward created successfully")
            refetch()
            resolve()
          },
          onError: (error) => {
            message.error(`Failed to create reward: ${error}`)
            reject(error)
          },
        })
      }
    })
  }

  const handleDelete = (id: string) => {
    modal.confirm({
      title: "Delete Reward",
      content: "Are you sure you want to delete this reward?",
      okText: "Delete",
      okType: "danger",
      onOk() {
        deleteReward(id, {
          onSuccess: () => {
            message.success("Reward deleted successfully")
            refetch()
          },
          onError: (error) => {
            message.error(`Failed to delete reward: ${error}`)
          },
        })
      },
    })
  }

  const handleReactivate = (reward: Reward) => {
    modal.confirm({
      title: "Reactivate Reward",
      content: `Are you sure you want to reactivate ${reward.name}?`,
      okText: "Reactivate",
      onOk() {
        updateReward(
          { id: reward.id, input: { isActive: true } },
          {
            onSuccess: () => {
              message.success("Reward reactivated successfully")
              refetch()
            },
            onError: (error) => {
              message.error(`Failed to reactivate reward: ${error}`)
            },
          },
        )
      },
    })
  }

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "Points",
      dataIndex: "costPoints",
      key: "costPoints",
      width: 100,
      align: "center" as const,
    },
    {
      title: "Limited Stock",
      dataIndex: "isLimited",
      key: "isLimited",
      width: 200,
      align: "center" as const,
      render: (isLimited: boolean, record: Reward) => (
        <Tag color={isLimited ? "red" : "green"}>
          {isLimited ? `${record.stock} items left` : "Unlimited"}
        </Tag>
      ),
    },
    {
      title: "Active",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 20,
      fixed: "right" as const,
      render: (_: unknown, record: Reward) => {
        const isInactive = !record.isActive

        const menuItems = isInactive
          ? [
              {
                key: "reactivate",
                label: "Reactivate",
                onClick: () => handleReactivate(record),
              },
            ]
          : [
              {
                key: "edit",
                label: "Edit",
                onClick: () => handleOpenModal(record),
              },
              {
                key: "delete",
                label: "Delete",
                danger: true,
                onClick: () => handleDelete(record.id),
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
    <AdminLayout breadcrumbs={[{ title: "Manage Rewards" }]}>
      <Card>
        <Space direction="vertical" className="w-full" size="large">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Manage Rewards</h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              Add Reward
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 flex gap-2 flex-wrap md:flex-nowrap">
              <DebouncedSearch
                placeholder="Search rewards by name..."
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
                placeholder="Filter by status"
                value={
                  filters.isActive === undefined
                    ? undefined
                    : filters.isActive
                      ? "active"
                      : "inactive"
                }
                onChange={(value) => {
                  if (value === "active") {
                    setFilters({ ...filters, isActive: true })
                  } else if (value === "inactive") {
                    setFilters({ ...filters, isActive: false })
                  } else {
                    setFilters({ ...filters, isActive: undefined })
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
            rowKey="id"
            loading={isLoading || isCreating || isUpdating || isDeleting}
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
        </Space>
      </Card>

      <EditRewardModal
        visible={showModal}
        reward={editingReward}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />
    </AdminLayout>
  )
}
