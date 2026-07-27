import type { Prisma } from "../../common/prisma-client"

import { notificationsQueries } from "./notifications.queries"

export const notificationsService = {
  createNotification: (
    userId: string,
    type: "MENTION" | "COMMENT" | "KUDO_RECEIVED" | "REDEMPTION_STATUS",
    payload: Prisma.InputJsonValue,
  ) => {
    return notificationsQueries.createNotification(userId, type, payload)
  },

  listUserNotifications: (
    userId: string,
    options?: { page?: number; limit?: number; unreadOnly?: boolean },
  ) => {
    return notificationsQueries.listUserNotifications(userId, options)
  },

  markAsRead: (notificationId: string) => {
    return notificationsQueries.markAsRead(notificationId)
  },

  markAllAsRead: (userId: string) => {
    return notificationsQueries.markAllAsRead(userId)
  },
}
