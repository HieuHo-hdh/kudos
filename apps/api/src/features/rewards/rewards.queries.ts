import { randomUUID } from "crypto"

import type {
  CreateRewardInput,
  ListRedemptionsQuery,
  ListRewardsQuery,
  UpdateRewardInput,
} from "@kudos/shared"

import { db } from "../../common/prisma-client"

export const rewardsQueries = {
  listRewards: async (query: ListRewardsQuery) => {
    const skip = (query.page - 1) * query.limit
    const where: Record<string, unknown> = {}

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" as const } },
        {
          description: {
            contains: query.search,
            mode: "insensitive" as const,
          },
        },
      ]
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive
    }

    const [items, total] = await Promise.all([
      db.reward.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
      }),
      db.reward.count({ where }),
    ])

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      hasMore: skip + query.limit < total,
    }
  },

  getRewardDetail: async (id: string) => {
    return db.reward.findUniqueOrThrow({
      where: { id },
    })
  },

  createReward: async (input: CreateRewardInput) => {
    return db.reward.create({
      data: {
        id: randomUUID(),
        ...input,
      },
    })
  },

  updateReward: async (id: string, input: UpdateRewardInput) => {
    return db.reward.update({
      where: { id },
      data: input,
    })
  },

  deleteReward: async (id: string) => {
    return db.reward.delete({
      where: { id },
    })
  },

  listAllRedemptions: async (query: ListRedemptionsQuery) => {
    const skip = (query.page - 1) * query.limit

    const [items, total] = await Promise.all([
      db.redemption.findMany({
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
      }),
      db.redemption.count(),
    ])

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      hasMore: skip + query.limit < total,
    }
  },

  getRedemptionDetail: async (id: string) => {
    return db.redemption.findUniqueOrThrow({
      where: { id },
    })
  },

  listUserRedemptions: async (userId: string, query: ListRedemptionsQuery) => {
    const skip = (query.page - 1) * query.limit

    const [items, total] = await Promise.all([
      db.redemption.findMany({
        where: { userId },
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
      }),
      db.redemption.count({ where: { userId } }),
    ])

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      hasMore: skip + query.limit < total,
    }
  },

  createRedemption: async (
    userId: string,
    rewardId: string,
    idempotencyKey: string,
  ) => {
    const reward = await db.reward.findUniqueOrThrow({
      where: { id: rewardId },
    })

    // Only check stock availability if reward is limited
    if (reward.isLimited && reward.stock <= 0) {
      throw new Error("This reward is out of stock")
    }

    return db.redemption.create({
      data: {
        id: randomUUID(),
        userId,
        rewardId,
        costPoints: reward.costPoints,
        idempotencyKey,
      },
    })
  },

  fulfillRedemption: async (id: string) => {
    return db.redemption.update({
      where: { id },
      data: {
        status: "FULFILLED",
        fulfilledAt: new Date(),
      },
    })
  },

  cancelRedemption: async (id: string, cancelReason?: string) => {
    return db.redemption.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelReason,
      },
    })
  },
}
