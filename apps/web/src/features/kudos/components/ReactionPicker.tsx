import { REACTION_EMOJIS } from "@kudos/shared"
import { Button, Space } from "antd"

export type ReactionType = keyof typeof REACTION_EMOJIS

interface ReactionPickerProps {
  onEmojiClick: (emoji: ReactionType) => void
  loading?: boolean
}

export function ReactionPicker({ onEmojiClick, loading }: ReactionPickerProps) {
  return (
    <Space>
      {(Object.entries(REACTION_EMOJIS) as Array<[ReactionType, string]>).map(
        ([type, emoji]) => (
          <Button
            key={type}
            type="text"
            size="small"
            onClick={() => onEmojiClick(type)}
            loading={loading}
            title={type}
          >
            {emoji}
          </Button>
        ),
      )}
    </Space>
  )
}
