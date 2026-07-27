import type { CoreValue, KudoDetail } from "@kudos/shared"
import { v4 as uuid } from "uuid"

import { db } from "../../common/prisma-client"

export const kudosQueries = {
  async listKudos(limit: number = 10, cursor?: string) {
    const kudos = await db.kudo.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reactions: true,
        comments: {
          where: { deletedAt: null },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })

    const hasMore = kudos.length > limit
    const items = kudos.slice(0, limit)
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return {
      items: items.map((kudo) => ({
        id: kudo.id,
        senderId: kudo.senderId,
        recipientId: kudo.recipientId,
        points: kudo.points,
        message: kudo.message,
        coreValue: kudo.coreValue,
        createdAt: kudo.createdAt.toISOString(),
        updatedAt: kudo.updatedAt.toISOString(),
        sender: kudo.sender,
        recipient: kudo.recipient,
        reactionCount: kudo.reactions.length,
        commentCount: kudo.comments.length,
      })) as KudoDetail[],
      hasMore,
      cursor: nextCursor,
    }
  },

  async getKudoDetail(kudoId: string): Promise<KudoDetail | null> {
    const kudo = await db.kudo.findUnique({
      where: { id: kudoId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reactions: true,
        comments: {
          where: { deletedAt: null },
        },
      },
    })

    if (!kudo || kudo.deletedAt) return null

    return {
      id: kudo.id,
      senderId: kudo.senderId,
      recipientId: kudo.recipientId,
      points: kudo.points,
      message: kudo.message,
      coreValue: kudo.coreValue,
      createdAt: kudo.createdAt.toISOString(),
      updatedAt: kudo.updatedAt.toISOString(),
      sender: kudo.sender,
      recipient: kudo.recipient,
      reactionCount: kudo.reactions.length,
      commentCount: kudo.comments.length,
    }
  },

  async createKudo(
    senderId: string,
    recipientId: string,
    points: number,
    message: string,
    coreValue: CoreValue,
    idempotencyKey: string,
  ) {
    const kudo = await db.kudo.create({
      data: {
        id: uuid(),
        senderId,
        recipientId,
        points,
        message,
        coreValue,
        idempotencyKey,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reactions: true,
        comments: true,
      },
    })

    return {
      id: kudo.id,
      senderId: kudo.senderId,
      recipientId: kudo.recipientId,
      points: kudo.points,
      message: kudo.message,
      coreValue: kudo.coreValue,
      createdAt: kudo.createdAt.toISOString(),
      updatedAt: kudo.updatedAt.toISOString(),
      sender: kudo.sender,
      recipient: kudo.recipient,
      reactionCount: kudo.reactions.length,
      commentCount: kudo.comments.length,
    } as KudoDetail
  },

  async softDeleteKudo(kudoId: string) {
    await db.kudo.update({
      where: { id: kudoId },
      data: { deletedAt: new Date() },
    })
  },

  async addReaction(kudoId: string, userId: string, emoji: string) {
    await db.reaction.upsert({
      where: { kudoId_userId_emoji: { kudoId, userId, emoji } },
      create: { id: uuid(), kudoId, userId, emoji },
      update: {},
    })
  },

  async removeReaction(kudoId: string, userId: string, emoji: string) {
    await db.reaction.delete({
      where: { kudoId_userId_emoji: { kudoId, userId, emoji } },
    })
  },

  async addComment(kudoId: string, userId: string, body: string) {
    const comment = await db.comment.create({
      data: {
        id: uuid(),
        kudoId,
        userId,
        body,
      },
    })
    return comment
  },

  async deleteComment(commentId: string) {
    await db.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    })
  },
}
