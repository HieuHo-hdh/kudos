import { randomUUID } from "crypto"

import type { Prisma } from "../../common/prisma-client"
import { db } from "../../common/prisma-client"

export const notificationsQueries = {
  createNotification: async (
    userId: string,
    type: "MENTION" | "COMMENT" | "KUDO_RECEIVED" | "REDEMPTION_STATUS",
    payload: Prisma.InputJsonValue,
  ) => {
    return db.notification.create({
      data: {
        id: randomUUID(),
        userId,
        type,
        payload,
      },
    })
  },

  listUserNotifications: async (
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ) => {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { userId }
    if (options.unreadOnly) {
      where.readAt = null
    }

    const [items, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.notification.count({ where }),
    ])

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    }
  },

  markAsRead: async (notificationId: string) => {
    return db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    })
  },

  markAllAsRead: async (userId: string) => {
    return db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
  },
}
