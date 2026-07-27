import { SmileOutlined, CommentOutlined } from "@ant-design/icons"
import type { KudoDetail } from "@kudos/shared"
import { Button, Card, Popover, Space, Tag, Tooltip, Typography } from "antd"
import { Divider } from "antd/es"
import type { EmojiClickData } from "emoji-picker-react"
import EmojiPicker, { EmojiStyle } from "emoji-picker-react"
import { useState } from "react"

interface KudoCardProps {
  kudo: KudoDetail
}

const coreValueColors: Record<string, string> = {
  TEAMWORK: "blue",
  OWNERSHIP: "green",
  INNOVATION: "purple",
  CUSTOMER_FIRST: "orange",
  INTEGRITY: "red",
}

export function KudoCard({ kudo }: KudoCardProps) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)

  const isToday =
    new Date(kudo.createdAt).toDateString() === new Date().toDateString()
  const time = new Date(kudo.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  const dateLabel = isToday
    ? `Today at ${time}`
    : new Date(kudo.createdAt).toLocaleDateString()

  const handleEmojiClick = (_emojiData: EmojiClickData) => {
    setEmojiPickerOpen(false)
  }

  const emojiPickerContent = (
    <EmojiPicker
      onEmojiClick={handleEmojiClick}
      width={300}
      height={400}
      emojiStyle={EmojiStyle.FACEBOOK}
    />
  )

  return (
    <Card className="hover:shadow-lg transition-shadow border-none">
      <Space direction="vertical" className="w-full" size="small">
        <Space direction="vertical" size="small" className="w-full">
          <Typography.Text className="text-base gap-1 flex items-center font-medium">
            Kudos {kudo.points} points for
            <Tooltip placement="right" title={kudo.recipient.email}>
              <span className="font-medium">{kudo.recipient.displayName}</span>
            </Tooltip>
          </Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            {dateLabel}
          </Typography.Text>
        </Space>
        <Divider className="my-2!" />
        <Space direction="vertical" size="small" className="w-full">
          <Tag color={coreValueColors[kudo.coreValue]} className="text-xs">
            #{kudo.coreValue.replace(/_/g, "")}
          </Tag>
          <Typography.Paragraph className="text-sm leading-relaxed italic">
            "{kudo.message}"
          </Typography.Paragraph>
        </Space>

        <Typography.Text
          type="secondary"
          className="text-xs gap-1 flex items-center"
        >
          From
          <Tooltip placement="bottom" title={kudo.sender.email}>
            <span className="font-medium">{kudo.sender.displayName}</span>
          </Tooltip>
        </Typography.Text>
        <Divider className="my-2!" />
        <div className="flex items-center gap-4">
          <Popover
            content={emojiPickerContent}
            placement="top"
            trigger="click"
            open={emojiPickerOpen}
            onOpenChange={setEmojiPickerOpen}
          >
            <Button type="text" size="small" icon={<SmileOutlined />}>
              React
            </Button>
          </Popover>
          <Button type="text" size="small" icon={<CommentOutlined />}>
            Comment
          </Button>
        </div>
      </Space>
    </Card>
  )
}
