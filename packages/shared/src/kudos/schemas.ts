import { z } from "zod"

export const CoreValueEnum = z.enum([
  "TEAMWORK",
  "OWNERSHIP",
  "INNOVATION",
  "CUSTOMER_FIRST",
  "INTEGRITY",
])

export type CoreValue = z.infer<typeof CoreValueEnum>

export const ReactionEmojiEnum = z.enum(["❤️", "👍", "🎉", "😂", "😮"])

export type ReactionEmoji = z.infer<typeof ReactionEmojiEnum>

export const REACTION_EMOJIS = {
  love: "❤️",
  like: "👍",
  congratulations: "🎉",
  laugh: "😂",
  wow: "😮",
} as const satisfies Record<string, ReactionEmoji>

export const CreateKudoInputSchema = z.object({
  recipientId: z.string().uuid(),
  points: z.number().int().min(10).max(50),
  message: z.string().min(1).max(500),
  coreValue: CoreValueEnum,
})

export type CreateKudoInput = z.infer<typeof CreateKudoInputSchema>

export const KudoDetailSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  recipientId: z.string().uuid(),
  points: z.number().int(),
  message: z.string(),
  coreValue: CoreValueEnum,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sender: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  recipient: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  reactionCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
})

export type KudoDetail = z.infer<typeof KudoDetailSchema>

export const ListKudosResponseSchema = z.object({
  items: z.array(KudoDetailSchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable(),
})

export type ListKudosResponse = z.infer<typeof ListKudosResponseSchema>
