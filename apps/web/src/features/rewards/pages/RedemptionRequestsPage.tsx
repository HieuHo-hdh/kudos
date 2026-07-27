import { CheckOutlined, CloseOutlined } from "@ant-design/icons"
import type { ListRewardsQuery, Redemption } from "@kudos/shared"
import { App, Button, Card, Space, Table, Tag } from "antd"
import { useState } from "react"

import { AdminLayout } from "../../user/AdminLayout"
import {
  useCancelRedemption,
  useFulfillRedemption,
  useRedemptionsList,
} from "../hooks/useRedemptions"

export function RedemptionRequestsPage() {
  const { message, modal } = App.useApp()

  const [pagination, setPagination] = useState({ page: 1, limit: 20 })

  const query: ListRewardsQuery = {
    page: pagination.page,
    limit: pagination.limit,
  }

  const { data, isLoading, refetch } = useRedemptionsList(query)
  const { mutate: fulfillRedemption, isPending: isFulfilling } =
    useFulfillRedemption()
  const { mutate: cancelRedemption, isPending: isCancelling } =
    useCancelRedemption()

  const handleFulfill = (id: string) => {
    modal.confirm({
      title: "Fulfill Redemption",
      content: "Mark this redemption as fulfilled?",
      okText: "Fulfill",
      onOk() {
        fulfillRedemption(id, {
          onSuccess: () => {
            message.success("Redemption fulfilled")
            refetch()
          },
          onError: (error) => {
            message.error(`Failed to fulfill: ${error}`)
          },
        })
      },
    })
  }

  const handleCancel = (id: string) => {
    modal.confirm({
      title: "Cancel Redemption",
      content: "Reason for cancellation:",
      okText: "Cancel",
      okType: "danger",
      onOk() {
        cancelRedemption(
          {
            id,
            input: { reason: "Cancelled by admin" },
          },
          {
            onSuccess: () => {
              message.success("Redemption cancelled")
              refetch()
            },
            onError: (error) => {
              message.error(`Failed to cancel: ${error}`)
            },
          },
        )
      },
    })
  }

  const statusColor: Record<string, string> = {
    PENDING: "orange",
    FULFILLED: "green",
    CANCELLED: "red",
  }

  const columns = [
    {
      title: "User ID",
      dataIndex: "userId",
      key: "userId",
    },
    {
      title: "Reward ID",
      dataIndex: "rewardId",
      key: "rewardId",
    },
    {
      title: "Points",
      dataIndex: "costPoints",
      key: "costPoints",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={statusColor[status] || "default"}>{status}</Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Redemption) => (
        <Space>
          {record.status === "PENDING" && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                loading={isFulfilling}
                onClick={() => handleFulfill(record.id)}
              >
                Fulfill
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                loading={isCancelling}
                onClick={() => handleCancel(record.id)}
              >
                Cancel
              </Button>
            </>
          )}
          {record.status !== "PENDING" && (
            <Tag color={statusColor[record.status]}>{record.status}</Tag>
          )}
        </Space>
      ),
    },
  ]

  return (
    <AdminLayout breadcrumbs={[{ title: "Redemption Requests" }]}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Redemption Requests</h1>
      </div>
      <Card>
        <Table
          columns={columns}
          dataSource={data?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={
            data?.total
              ? {
                  current: pagination.page,
                  pageSize: pagination.limit,
                  total: data.total,
                  onChange: (page: number) =>
                    setPagination({ ...pagination, page }),
                }
              : false
          }
        />
      </Card>
    </AdminLayout>
  )
}
