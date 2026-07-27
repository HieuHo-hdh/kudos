import { GiftOutlined } from "@ant-design/icons"
import type { ListRewardsQuery, Reward } from "@kudos/shared"
import {
  App,
  Button,
  Card,
  Col,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd"
import { useState } from "react"

import { useCurrentUser } from "../../../common/hooks/useCurrentUser"
import {
  useCreateRedemption,
  useMyRedemptions,
  useRewardsList,
} from "../../rewards"

export function RedeemRewardsPage() {
  const { message, modal } = App.useApp()
  const { data: user } = useCurrentUser()
  const [view, setView] = useState<"available" | "history">("available")
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })

  // Fetch available rewards
  const rewardsQuery: ListRewardsQuery = {
    page: pagination.page,
    limit: pagination.limit,
    isActive: true,
  }
  const { data: rewardsData, isLoading: rewardsLoading } =
    useRewardsList(rewardsQuery)

  // Fetch user's redemptions
  const {
    data: redemptionsData,
    isLoading: redemptionsLoading,
    refetch: refetchRedemptions,
  } = useMyRedemptions({ page: 1, limit: 20 })

  // Redeem mutation
  const redeemMutation = useCreateRedemption()

  const handleRedeem = (rewardId: string, rewardName: string, cost: number) => {
    if (!user) return

    if (user.earnedBalance < cost) {
      message.error(
        `Insufficient points. You need ${cost} points but only have ${user.earnedBalance}`,
      )
      return
    }

    modal.confirm({
      title: "Redeem Reward",
      content: `Are you sure you want to redeem "${rewardName}" for ${cost} points?`,
      okText: "Redeem",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await redeemMutation.mutateAsync(rewardId)
          message.success(`Successfully redeemed "${rewardName}"!`)
          refetchRedemptions()
        } catch (error) {
          const err = error as Error
          message.error(err.message || "Failed to redeem reward")
        }
      },
    })
  }

  const availableRewards = rewardsData?.items || []
  const myRedemptions = redemptionsData?.items || []

  const rewardColumns = [
    {
      title: "Reward",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Reward) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{text}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
            {record.description}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Cost",
      dataIndex: "costPoints",
      key: "costPoints",
      width: 100,
      render: (points: number) => (
        <Statistic
          value={points}
          suffix="pts"
          valueStyle={{ fontSize: "14px", color: "#1890ff" }}
        />
      ),
    },
    {
      title: "Stock",
      dataIndex: ["isLimited", "stock"],
      key: "stock",
      width: 100,
      render: (_: unknown, record: Reward) => {
        if (!record.isLimited) return <Tag color="green">Unlimited</Tag>
        return (
          <Tag color={record.stock > 0 ? "blue" : "red"}>
            {record.stock} left
          </Tag>
        )
      },
    },
    {
      title: "Action",
      key: "action",
      width: 150,
      render: (_: unknown, record: Reward) => {
        const canRedeem =
          user && user.earnedBalance >= record.costPoints && record.isActive
        const outOfStock = record.isLimited && record.stock <= 0

        return (
          <Button
            type="primary"
            size="small"
            loading={redeemMutation.isPending}
            disabled={!canRedeem || outOfStock}
            onClick={() =>
              handleRedeem(record.id, record.name, record.costPoints)
            }
          >
            Redeem
          </Button>
        )
      },
    },
  ]

  const redemptionColumns = [
    {
      title: "Reward",
      dataIndex: ["reward", "name"],
      key: "rewardName",
      render: (text: string) => <Typography.Text>{text}</Typography.Text>,
    },
    {
      title: "Points",
      dataIndex: "costPoints",
      key: "costPoints",
      width: 100,
      render: (points: number) => (
        <Typography.Text type="danger">-{points}</Typography.Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
          PENDING: { color: "orange", label: "Pending" },
          FULFILLED: { color: "green", label: "Fulfilled" },
          CANCELLED: { color: "red", label: "Cancelled" },
        }
        const config = statusConfig[status] || {
          color: "default",
          label: status,
        }
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => {
        return new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      },
    },
  ]

  return (
    <div style={{ padding: "24px" }}>
      {/* Points Header */}
      <Card
        style={{ marginBottom: "24px" }}
        styles={{
          body: { padding: "24px" },
        }}
      >
        <Row gutter={32}>
          <Col xs={12} sm={8}>
            <Statistic
              title="Your Points"
              value={user?.earnedBalance || 0}
              suffix="pts"
              prefix={<GiftOutlined />}
              valueStyle={{ color: "#1890ff", fontSize: "28px" }}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title="Available Rewards"
              value={availableRewards.length}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic title="Total Redeemed" value={myRedemptions.length} />
          </Col>
        </Row>
      </Card>

      {/* View Toggle */}
      <Card style={{ marginBottom: "24px" }}>
        <Segmented
          value={view}
          onChange={(val) => setView(val as "available" | "history")}
          options={[
            { label: "Available Rewards", value: "available" },
            { label: "My Redemptions", value: "history" },
          ]}
          block
        />
      </Card>

      {/* Available Rewards Table */}
      {view === "available" && (
        <Card
          loading={rewardsLoading}
          title={
            <Typography.Title level={4}>Available Rewards</Typography.Title>
          }
        >
          <Table
            columns={rewardColumns}
            dataSource={availableRewards}
            rowKey="id"
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: rewardsData?.total || 0,
              onChange: (page, pageSize) => {
                setPagination({ page, limit: pageSize })
              },
            }}
            loading={rewardsLoading}
          />
        </Card>
      )}

      {/* Redemption History Table */}
      {view === "history" && (
        <Card
          loading={redemptionsLoading}
          title={<Typography.Title level={4}>My Redemptions</Typography.Title>}
        >
          {myRedemptions.length === 0 && !redemptionsLoading ? (
            <Typography.Text type="secondary">
              You haven't redeemed any rewards yet. Start redeeming from
              available rewards!
            </Typography.Text>
          ) : (
            <Table
              columns={redemptionColumns}
              dataSource={myRedemptions}
              rowKey="id"
              loading={redemptionsLoading}
            />
          )}
        </Card>
      )}
    </div>
  )
}
