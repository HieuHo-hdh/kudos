import { DeleteOutlined } from "@ant-design/icons"
import { Avatar, Button, Empty, List, Modal, Space, Popconfirm } from "antd"
import { useState } from "react"

interface Reaction {
  emoji: string
  user: {
    id: string
    displayName: string
    email: string
    avatarUrl: string | null
  }
}

interface ReactionsModalProps {
  open: boolean
  onClose: () => void
  reactions: Reaction[]
  loading?: boolean
  currentUserId?: string
  onDeleteReaction?: (emoji: string) => Promise<void>
}

export function ReactionsModal({
  open,
  onClose,
  reactions,
  loading,
  currentUserId,
  onDeleteReaction,
}: ReactionsModalProps) {
  const [deletingEmoji, setDeletingEmoji] = useState<string | null>(null)
  const groupedByEmoji = reactions.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = []
      }
      acc[reaction.emoji]!.push(reaction.user)
      return acc
    },
    {} as Record<string, Reaction["user"][]>,
  )

  const handleDeleteReaction = async (emoji: string) => {
    if (!onDeleteReaction) return

    setDeletingEmoji(emoji)
    try {
      await onDeleteReaction(emoji)
    } finally {
      setDeletingEmoji(null)
    }
  }

  const currentUserReactions = reactions
    .filter((r) => r.user.id === currentUserId)
    .map((r) => r.emoji)

  return (
    <Modal title="Reactions" open={open} onCancel={onClose} footer={null}>
      {reactions.length === 0 ? (
        <Empty description="No reactions yet" />
      ) : (
        <Space direction="vertical" className="w-full">
          {Object.entries(groupedByEmoji).map(([emoji, users]) => (
            <div key={emoji}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">
                  {emoji} {users.length}
                </div>
                {onDeleteReaction && currentUserReactions.includes(emoji) && (
                  <Popconfirm
                    title="Remove reaction"
                    description="Are you sure you want to remove this reaction?"
                    onConfirm={() => handleDeleteReaction(emoji)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{
                      danger: true,
                      loading: deletingEmoji === emoji,
                    }}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={deletingEmoji === emoji}
                    />
                  </Popconfirm>
                )}
              </div>
              <List
                dataSource={users}
                renderItem={(user) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar size={32} src={user.avatarUrl} />}
                      title={user.displayName}
                      description={user.email}
                    />
                  </List.Item>
                )}
                loading={loading}
                className="text-sm"
              />
            </div>
          ))}
        </Space>
      )}
    </Modal>
  )
}
