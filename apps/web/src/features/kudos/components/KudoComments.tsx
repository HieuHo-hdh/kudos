import {
  CommentOutlined,
  DeleteOutlined,
  HeartOutlined,
} from "@ant-design/icons"
import {
  Button,
  Input,
  Popover,
  Space,
  Spin,
  Avatar,
  Tooltip,
  Divider,
  Popconfirm,
} from "antd"
import { useState } from "react"

import { useListReactions } from "../hooks/useKudos"

import { ReactionPicker, type ReactionType } from "./ReactionPicker"
import { ReactionsModal } from "./ReactionsModal"

interface Comment {
  id: string
  body: string
  user: {
    id: string
    displayName: string
    email: string
    avatarUrl: string | null
  }
  createdAt: string
}

interface KudoCommentsProps {
  kudoId: string
  commentCount: number
  comments?: Comment[]
  isLoadingComments?: boolean
  onAddComment: (body: string) => Promise<void>
  onDeleteComment?: (commentId: string) => Promise<void>
  isLoading?: boolean
  showComments: boolean
  onShowCommentsChange: (show: boolean) => void
  reactionCount?: number
  onReactionClick?: (type: ReactionType) => void
  isAddingReaction?: boolean
  currentUserId?: string
  onDeleteReaction?: (emoji: string) => Promise<void>
}

export function KudoComments({
  kudoId,
  commentCount,
  comments = [],
  isLoadingComments = false,
  onAddComment,
  onDeleteComment,
  isLoading = false,
  showComments,
  onShowCommentsChange,
  reactionCount = 0,
  onReactionClick,
  isAddingReaction = false,
  currentUserId,
  onDeleteReaction,
}: KudoCommentsProps) {
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false)
  const [reactionsModalOpen, setReactionsModalOpen] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  )

  const { data: reactions = [], isLoading: isLoadingReactions } =
    useListReactions(reactionsModalOpen ? kudoId : "")

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return

    setIsSubmitting(true)
    try {
      await onAddComment(commentText)
      setCommentText("")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return

    setDeletingCommentId(commentId)
    try {
      await onDeleteComment(commentId)
    } finally {
      setDeletingCommentId(null)
    }
  }

  return (
    <Space direction="vertical" className="w-full gap-4!" size="small">
      <div className="flex items-center gap-2">
        {onReactionClick && (
          <Popover
            content={
              <ReactionPicker
                onEmojiClick={onReactionClick}
                loading={isAddingReaction}
              />
            }
            placement="bottomLeft"
            trigger="hover"
            overlayInnerStyle={{ padding: 4 }}
            open={reactionPickerOpen}
            onOpenChange={setReactionPickerOpen}
          >
            <Button
              className="px-2!"
              onClick={() => setReactionsModalOpen(true)}
            >
              <HeartOutlined /> {reactionCount}{" "}
              {reactionCount === 1 ? "reaction" : "reactions"}
            </Button>
          </Popover>
        )}
        <Button
          onClick={() => onShowCommentsChange(!showComments)}
          disabled={isLoading}
          className="px-2!"
        >
          <CommentOutlined /> {commentCount}{" "}
          {commentCount === 1 ? "comment" : "comments"}
        </Button>
      </div>

      {showComments && (
        <Space
          direction="vertical"
          className="w-full pl-4 border-l border-gray-200 gap-2!"
          size="small"
        >
          <Space.Compact className="w-full">
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCommentText(e.target.value)
              }
              onPressEnter={handleSubmitComment}
              disabled={isSubmitting}
              autoFocus
            />
            <Button
              type="primary"
              onClick={handleSubmitComment}
              loading={isSubmitting}
            >
              Post
            </Button>
          </Space.Compact>

          {isLoadingComments ? (
            <Spin size="small" />
          ) : comments.length > 0 ? (
            <>
              <Divider className="my-2!" />
              {comments.map((comment) => (
                <div key={comment.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar
                        size={24}
                        src={comment?.user?.avatarUrl}
                        alt={comment?.user?.displayName}
                      />
                      <Tooltip title={comment?.user?.email}>
                        <span className="font-medium">
                          {comment?.user?.displayName}
                        </span>
                      </Tooltip>
                    </div>
                    {onDeleteComment && comment?.user?.id === currentUserId && (
                      <Popconfirm
                        title="Delete comment"
                        description="Are you sure you want to delete this comment?"
                        onConfirm={() => handleDeleteComment(comment?.id ?? "")}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{
                          danger: true,
                          loading: deletingCommentId === comment.id,
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={deletingCommentId === comment.id}
                        />
                      </Popconfirm>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 ml-8">{comment.body}</p>
                  <p className="text-xs text-gray-400 ml-8">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </>
          ) : (
            <p className="text-xs text-gray-500">No comments yet</p>
          )}
        </Space>
      )}
      <ReactionsModal
        open={reactionsModalOpen}
        onClose={() => setReactionsModalOpen(false)}
        reactions={reactions}
        loading={isLoadingReactions}
        currentUserId={currentUserId}
        onDeleteReaction={onDeleteReaction}
      />
    </Space>
  )
}
