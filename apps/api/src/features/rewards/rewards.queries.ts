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
    // Check for idempotency - return existing redemption if already processed
    const existing = await db.redemption.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey,
        },
      },
    })

    if (existing) {
      return existing
    }

    // Use transaction with serializable isolation to prevent race conditions
    return db.$transaction(
      async (tx) => {
        // Fetch and lock user row (pessimistic locking) to prevent concurrent modifications
        const [userLocked] = await tx.$queryRaw<
          Array<{ id: string; earned_balance: number }>
        >`SELECT id, "earned_balance" FROM users WHERE id = ${userId}::uuid FOR UPDATE`

        if (!userLocked) {
          throw new Error("User not found")
        }

        // Fetch reward
        const reward = await tx.reward.findUniqueOrThrow({
          where: { id: rewardId },
        })

        // Validate reward is active
        if (!reward.isActive) {
          throw new Error("This reward is no longer available")
        }

        // Check stock availability if reward is limited
        if (reward.isLimited && reward.stock <= 0) {
          throw new Error("This reward is out of stock")
        }

        // Validate user has sufficient points (using locked row data)
        if (userLocked.earned_balance < reward.costPoints) {
          throw new Error(
            `Insufficient points. You have ${userLocked.earned_balance} points but need ${reward.costPoints}`,
          )
        }

        const user = userLocked

        // Create redemption
        const redemption = await tx.redemption.create({
          data: {
            id: randomUUID(),
            userId,
            rewardId,
            costPoints: reward.costPoints,
            idempotencyKey,
          },
        })

        // Deduct points from user
        const newBalance = user.earned_balance - reward.costPoints
        await tx.user.update({
          where: { id: userId },
          data: { earnedBalance: newBalance },
        })

        // Create points transaction record
        await tx.pointsTransaction.create({
          data: {
            id: randomUUID(),
            userId,
            type: "REDEEM",
            amount: -reward.costPoints,
            balanceAfter: newBalance,
            redemptionId: redemption.id,
            note: `Redeemed: ${reward.name}`,
          },
        })

        // Decrease stock if reward is limited
        if (reward.isLimited) {
          await tx.reward.update({
            where: { id: rewardId },
            data: { stock: reward.stock - 1 },
          })
        }

        return redemption
      },
      {
        isolationLevel: "Serializable",
      },
    )
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
    return db.$transaction(async (tx) => {
      // Get redemption details
      const redemption = await tx.redemption.findUniqueOrThrow({
        where: { id },
      })

      // Refund points to user
      const user = await tx.user.findUniqueOrThrow({
        where: { id: redemption.userId },
      })

      const newBalance = user.earnedBalance + redemption.costPoints
      await tx.user.update({
        where: { id: redemption.userId },
        data: { earnedBalance: newBalance },
      })

      // Create points transaction record for refund
      await tx.pointsTransaction.create({
        data: {
          id: randomUUID(),
          userId: redemption.userId,
          type: "REDEEM",
          amount: redemption.costPoints,
          balanceAfter: newBalance,
          redemptionId: redemption.id,
          note: `Refund: ${cancelReason || "Redemption cancelled"}`,
        },
      })

      // Update redemption status
      return tx.redemption.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelReason,
        },
      })
    })
  },
}
