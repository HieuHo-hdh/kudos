import { REACTION_EMOJIS, type KudoDetail } from "@kudos/shared"
import {
  App,
  Card,
  Divider,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd"
import { useState } from "react"

import { useCurrentUser } from "../../../common/hooks/useCurrentUser"
import {
  useAddComment,
  useAddReaction,
  useDeleteComment,
  useRemoveReaction,
  useListComments,
} from "../hooks/useKudos"

import { KudoComments } from "./KudoComments"
import { type ReactionType } from "./ReactionPicker"

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
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const { data: authData } = useCurrentUser()
  const [showComments, setShowComments] = useState(false)
  const { mutate: addReaction, isPending } = useAddReaction()
  const { mutate: addComment, isPending: isAddingComment } = useAddComment()
  const { mutate: deleteComment, isPending: isDeletingComment } =
    useDeleteComment()
  const { mutate: removeReaction, isPending: isRemovingReaction } =
    useRemoveReaction()
  const { data: comments, isLoading: isLoadingComments } = useListComments(
    showComments ? (kudo?.id ?? "") : "",
  )

  const isToday = kudo?.createdAt
    ? new Date(kudo.createdAt).toDateString() === new Date().toDateString()
    : false
  const time = kudo?.createdAt
    ? new Date(kudo.createdAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : ""
  const dateLabel =
    isToday && kudo?.createdAt
      ? `Today at ${time}`
      : kudo?.createdAt
        ? new Date(kudo.createdAt).toLocaleDateString()
        : ""

  const handleReactionClick = (reactionType: ReactionType) => {
    if (!kudo?.id) return
    addReaction(
      { kudoId: kudo.id, emoji: REACTION_EMOJIS[reactionType] },
      {
        onSuccess: () => {
          message.success("Reaction added!")
        },
        onError: (error) => {
          message.error(`Failed to add reaction: ${error.message}`)
        },
      },
    )
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!kudo?.id) return Promise.reject(new Error("Kudo ID is missing"))
    return new Promise<void>((resolve, reject) => {
      deleteComment(
        { kudoId: kudo.id, commentId },
        {
          onSuccess: () => {
            message.success("Comment deleted!")
            resolve()
          },
          onError: (error) => {
            message.error(`Failed to delete comment: ${error.message}`)
            reject(error)
          },
        },
      )
    })
  }

  const handleDeleteReaction = async (emoji: string) => {
    if (!kudo?.id) return Promise.reject(new Error("Kudo ID is missing"))
    return new Promise<void>((resolve, reject) => {
      removeReaction(
        { kudoId: kudo.id, emoji },
        {
          onSuccess: () => {
            message.success("Reaction removed!")
            resolve()
          },
          onError: (error) => {
            message.error(`Failed to remove reaction: ${error.message}`)
            reject(error)
          },
        },
      )
    })
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow border-none">
        <Space direction="vertical" className="w-full" size="small">
          <Space direction="vertical" size="small" className="w-full">
            <Typography.Text className="text-base gap-1 flex items-center font-medium">
              Kudos{" "}
              <span style={{ color: token.colorPrimary }}>
                {kudo?.points} points{" "}
              </span>{" "}
              for
              <Tooltip placement="right" title={kudo?.recipient?.email}>
                <span
                  className="font-medium"
                  style={{ color: token.colorPrimary }}
                >
                  {kudo?.recipient?.displayName}
                </span>
              </Tooltip>
            </Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {dateLabel}
            </Typography.Text>
          </Space>
          <Divider className="my-2!" />
          <Space direction="vertical" size="small" className="w-full">
            <Tag
              color={
                kudo?.coreValue ? coreValueColors[kudo.coreValue] : undefined
              }
              className="text-xs"
            >
              #{kudo?.coreValue?.replace(/_/g, "")}
            </Tag>
            <Typography.Paragraph className="text-sm leading-relaxed italic m-0">
              "{kudo?.message}"
            </Typography.Paragraph>
            <Typography.Text
              type="secondary"
              className="text-xs gap-1 flex items-center"
            >
              From
              <Tooltip placement="right" title={kudo?.sender?.email}>
                <span
                  className="font-medium"
                  style={{ color: token.colorPrimary }}
                >
                  {kudo?.sender?.displayName}
                </span>
              </Tooltip>
            </Typography.Text>
          </Space>
          <Divider className="my-2!" />
          <KudoComments
            kudoId={kudo?.id ?? ""}
            commentCount={kudo?.commentCount ?? 0}
            comments={comments}
            isLoadingComments={isLoadingComments}
            onAddComment={(body) => {
              if (!kudo?.id)
                return Promise.reject(new Error("Kudo ID is missing"))
              return new Promise((resolve, reject) => {
                addComment(
                  { kudoId: kudo.id, body },
                  {
                    onSuccess: () => {
                      message.success("Comment added!")
                      resolve()
                    },
                    onError: (error) => {
                      message.error(`Failed to add comment: ${error.message}`)
                      reject(error)
                    },
                  },
                )
              })
            }}
            onDeleteComment={handleDeleteComment}
            isLoading={isAddingComment || isDeletingComment}
            showComments={showComments}
            onShowCommentsChange={setShowComments}
            reactionCount={kudo?.reactionCount ?? 0}
            onReactionClick={handleReactionClick}
            isAddingReaction={isPending || isRemovingReaction}
            currentUserId={authData?.id}
            onDeleteReaction={handleDeleteReaction}
          />
        </Space>
      </Card>
    </>
  )
}
