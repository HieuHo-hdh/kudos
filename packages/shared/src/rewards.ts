import { z } from "zod"

export interface Reward {
  id: string
  name: string
  description: string
  costPoints: number
  imageUrl?: string | null
  isLimited: boolean
  stock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateRewardInput {
  name: string
  description: string
  costPoints: number
  imageUrl?: string | null
  isLimited: boolean
  stock?: number
}

export interface UpdateRewardInput {
  name?: string
  description?: string
  costPoints?: number
  imageUrl?: string | null
  isLimited?: boolean
  stock?: number
  isActive?: boolean
}

export interface ListRewardsQuery {
  page: number
  limit: number
  search?: string
  isActive?: boolean
}

export interface Redemption {
  id: string
  userId: string
  rewardId: string
  costPoints: number
  status: "PENDING" | "FULFILLED" | "CANCELLED"
  createdAt: string
  fulfilledAt: string | null
}

export interface CreateRedemptionInput {
  reason?: string
}

export interface ListRedemptionsQuery {
  page: number
  limit: number
}

export const CreateRewardInput = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    costPoints: z.number().min(0, "Cost points must be non-negative"),
    imageUrl: z.string().url().or(z.literal("")).nullable().optional(),
    isLimited: z.boolean(),
    stock: z.number().min(0, "Stock must be non-negative").optional(),
  })
  .refine(
    (data) => !data.isLimited || (data.stock !== undefined && data.stock > 0),
    {
      message: "Stock is required and must be at least 1 for limited rewards",
      path: ["stock"],
    },
  )

export const UpdateRewardInput = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    costPoints: z.number().min(0).optional(),
    imageUrl: z.string().url().or(z.literal("")).nullable().optional(),
    isLimited: z.boolean().optional(),
    stock: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.isLimited === undefined ||
      !data.isLimited ||
      (data.stock !== undefined && data.stock > 0),
    {
      message: "Stock is required and must be at least 1 for limited rewards",
      path: ["stock"],
    },
  )

export const ListRewardsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
  search: z.string().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
})

export const CreateRedemptionInput = z.object({
  reason: z.string().optional(),
})

export const ListRedemptionsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
})
