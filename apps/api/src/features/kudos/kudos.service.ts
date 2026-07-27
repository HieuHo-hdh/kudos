import { ErrorCode, type CreateKudoInput } from "@kudos/shared"
import { v4 as uuid } from "uuid"

import { ForbiddenError, NotFoundError } from "../../common/errors"
import { db } from "../../common/prisma-client"

import * as kudosQueries from "./kudos.queries"

export const kudosService = {
  async listKudos(limit: number = 10, cursor?: string) {
    return kudosQueries.kudosQueries.listKudos(limit, cursor)
  },

  async getKudoDetail(id: string) {
    const kudo = await kudosQueries.kudosQueries.getKudoDetail(id)
    if (!kudo) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, `Kudo ${id} not found`)
    }
    return kudo
  },

  async createKudo(userId: string, input: CreateKudoInput) {
    const sender = await db.user.findUnique({
      where: { id: userId },
      select: { givingBudgetRemaining: true },
    })

    if (!sender) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, "User not found")
    }

    if (sender.givingBudgetRemaining < input.points) {
      throw new ForbiddenError(
        ErrorCode.INSUFFICIENT_BUDGET,
        "Insufficient giving budget",
      )
    }

    const recipient = await db.user.findUnique({
      where: { id: input.recipientId },
    })

    if (!recipient) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, "Recipient not found")
    }

    if (userId === input.recipientId) {
      throw new ForbiddenError(
        ErrorCode.SELF_KUDO_FORBIDDEN,
        "Cannot give kudo to yourself",
      )
    }

    const idempotencyKey = uuid()

    return await db.$transaction(async (tx) => {
      const kudo = await kudosQueries.kudosQueries.createKudo(
        userId,
        input.recipientId,
        input.points,
        input.message,
        input.coreValue,
        idempotencyKey,
      )

      await tx.user.update({
        where: { id: userId },
        data: {
          givingBudgetRemaining: sender.givingBudgetRemaining - input.points,
        },
      })

      await tx.user.update({
        where: { id: input.recipientId },
        data: { earnedBalance: { increment: input.points } },
      })

      await tx.pointsTransaction.create({
        data: {
          id: uuid(),
          userId: input.recipientId,
          type: "RECEIVE",
          amount: input.points,
          balanceAfter: recipient.earnedBalance + input.points,
          kudoId: kudo.id,
        },
      })

      await tx.pointsTransaction.create({
        data: {
          id: uuid(),
          userId,
          type: "GIVE",
          amount: -input.points,
          balanceAfter: sender.givingBudgetRemaining - input.points,
          kudoId: kudo.id,
        },
      })

      return kudo
    })
  },

  async deleteKudo(id: string, userId: string) {
    const kudo = await db.kudo.findUnique({
      where: { id },
      select: { senderId: true, deletedAt: true },
    })

    if (!kudo || kudo.deletedAt) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, `Kudo ${id} not found`)
    }

    if (kudo.senderId !== userId) {
      throw new ForbiddenError(
        ErrorCode.FORBIDDEN,
        "Can only delete your own kudos",
      )
    }

    await kudosQueries.kudosQueries.softDeleteKudo(id)
  },

  async addReaction(kudoId: string, userId: string, emoji: string) {
    const kudo = await db.kudo.findUnique({
      where: { id: kudoId },
      select: { deletedAt: true },
    })

    if (!kudo || kudo.deletedAt) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, `Kudo ${kudoId} not found`)
    }

    await kudosQueries.kudosQueries.addReaction(kudoId, userId, emoji)
  },

  async removeReaction(kudoId: string, userId: string, emoji: string) {
    const kudo = await db.kudo.findUnique({
      where: { id: kudoId },
      select: { deletedAt: true },
    })

    if (!kudo || kudo.deletedAt) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, `Kudo ${kudoId} not found`)
    }

    try {
      await kudosQueries.kudosQueries.removeReaction(kudoId, userId, emoji)
    } catch {
      throw new NotFoundError(ErrorCode.NOT_FOUND, "Reaction not found")
    }
  },

  async addComment(kudoId: string, userId: string, body: string) {
    const kudo = await db.kudo.findUnique({
      where: { id: kudoId },
      select: { deletedAt: true },
    })

    if (!kudo || kudo.deletedAt) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, `Kudo ${kudoId} not found`)
    }

    return await kudosQueries.kudosQueries.addComment(kudoId, userId, body)
  },

  async deleteComment(commentId: string, userId: string) {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, deletedAt: true },
    })

    if (!comment || comment.deletedAt) {
      throw new NotFoundError(
        ErrorCode.NOT_FOUND,
        `Comment ${commentId} not found`,
      )
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError(
        ErrorCode.FORBIDDEN,
        "Can only delete your own comments",
      )
    }

    await kudosQueries.kudosQueries.deleteComment(commentId)
  },
}
