import { BellOutlined } from "@ant-design/icons"
import { Badge, Button, Dropdown, Empty, Spin, Typography, Tag } from "antd"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { useNotifications } from "../hooks/useNotifications"
import type {
  Notification,
  KudoReceivedPayload,
  RedemptionStatusPayload,
} from "../notifications.types"

const { Text } = Typography

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: Notification
  onMarkAsRead: (id: string) => Promise<void>
}) {
  const navigate = useNavigate()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (notification.type === "KUDO_RECEIVED") {
      const payload = notification.payload as unknown as KudoReceivedPayload
      navigate(`/kudos/${payload.kudoId}`)
    } else if (notification.type === "REDEMPTION_STATUS") {
      navigate("/admin/redemptions")
    }
    await onMarkAsRead(notification.id)
  }

  if (notification.type === "KUDO_RECEIVED") {
    const payload = notification.payload as unknown as KudoReceivedPayload
    return (
      <div
        onClick={handleClick}
        className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-200 transition-colors bg-white"
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <Text strong>You received kudos!</Text>
            <div className="text-gray-600 text-sm mt-1 break-words">
              {payload.message}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Tag color="blue">{payload.points} pts</Tag>
              <Text type="secondary" className="text-xs">
                {formatDate(notification.createdAt)}
              </Text>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notification.type === "REDEMPTION_STATUS") {
    const payload = notification.payload as unknown as RedemptionStatusPayload
    const isFulfilled = payload.status === "FULFILLED"
    const statusColor = isFulfilled ? "green" : "red"
    const statusLabel = isFulfilled
      ? "Redemption Approved"
      : "Redemption Rejected"

    return (
      <div
        onClick={handleClick}
        className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-200 transition-colors bg-white"
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <Text strong>{statusLabel}</Text>
            {payload.reason && (
              <div className="text-gray-600 text-sm mt-1">{payload.reason}</div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Tag color={statusColor}>
                {payload.costPoints} pts
                {payload.pointsRefunded && " (refunded)"}
              </Tag>
              <Text type="secondary" className="text-xs">
                {formatDate(notification.createdAt)}
              </Text>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export function NotificationsDropdown() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch,
  } = useNotifications()

  // Load notifications on component mount
  useEffect(() => {
    refetch()
  }, [refetch])

  const handleOpenChange = async (open: boolean) => {
    if (open) {
      await refetch()
    }
  }

  const dropdownContent = (
    <div className="w-96 max-h-96 overflow-y-auto bg-white rounded-lg shadow-lg">
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Spin />
        </div>
      ) : notifications && notifications.length > 0 ? (
        <>
          <div className="p-3 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0">
            <Text strong>Notifications ({unreadCount})</Text>
            {unreadCount > 0 && (
              <Button type="text" size="small" onClick={() => markAllAsRead()}>
                Mark all as read
              </Button>
            )}
          </div>
          <div className="bg-white">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="p-8 bg-white">
          <Empty description="No notifications" />
        </div>
      )}
    </div>
  )

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={["click"]}
      placement="bottomRight"
      onOpenChange={handleOpenChange}
    >
      <Button
        type="text"
        className="!px-2 !h-auto relative"
        aria-label="Notifications"
      >
        <Badge count={unreadCount} showZero={false}>
          <BellOutlined className="text-lg" />
        </Badge>
      </Button>
    </Dropdown>
  )
}
