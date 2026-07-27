import { randomUUID } from "crypto"

import { describe, it, expect, beforeEach } from "vitest"

import { makeUser } from "../../../test/fixtures/user"
import { db } from "../../common/prisma-client"

import { notificationsQueries } from "./notifications.queries"

describe("Notifications Queries", () => {
  let userId: string

  beforeEach(async () => {
    const { user } = await makeUser({
      email: `user-${Date.now()}@test.local`,
      password: "testpass123",
    })
    userId = user.id
  })

  describe("createNotification", () => {
    it("should create notification with payload", async () => {
      const payload = {
        kudoId: randomUUID(),
        giverId: randomUUID(),
        message: "Great work!",
        points: 100,
      }

      const result = await notificationsQueries.createNotification(
        userId,
        "KUDO_RECEIVED",
        payload,
      )

      expect(result).toMatchObject({
        userId,
        type: "KUDO_RECEIVED",
        payload,
        readAt: null,
      })
      expect(result.id).toBeDefined()
      expect(result.createdAt).toBeDefined()
    })

    it("should create REDEMPTION_STATUS notification", async () => {
      const payload = {
        redemptionId: randomUUID(),
        rewardId: randomUUID(),
        status: "FULFILLED",
        costPoints: 200,
      }

      const result = await notificationsQueries.createNotification(
        userId,
        "REDEMPTION_STATUS",
        payload,
      )

      expect(result.type).toBe("REDEMPTION_STATUS")
      expect(result.payload.status).toBe("FULFILLED")
    })
  })

  describe("listUserNotifications", () => {
    it("should list user notifications", async () => {
      // Create test notifications
      for (let i = 0; i < 3; i++) {
        await db.notification.create({
          data: {
            id: randomUUID(),
            userId,
            type: "KUDO_RECEIVED",
            payload: { kudoId: randomUUID(), points: 100 },
          },
        })
      }

      const result = await notificationsQueries.listUserNotifications(userId, {
        page: 1,
        limit: 10,
      })

      expect(result.items.length).toBeGreaterThanOrEqual(3)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it("should filter unread only", async () => {
      const unreadNotif = await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
        },
      })

      await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
          readAt: new Date(),
        },
      })

      const result = await notificationsQueries.listUserNotifications(userId, {
        page: 1,
        limit: 10,
        unreadOnly: true,
      })

      expect(result.items).toContainEqual(
        expect.objectContaining({ id: unreadNotif.id }),
      )
      expect(result.items.every((n) => n.readAt === null)).toBe(true)
    })

    it("should support pagination", async () => {
      for (let i = 0; i < 5; i++) {
        await db.notification.create({
          data: {
            id: randomUUID(),
            userId,
            type: "KUDO_RECEIVED",
            payload: { kudoId: randomUUID() },
          },
        })
      }

      const page1 = await notificationsQueries.listUserNotifications(userId, {
        page: 1,
        limit: 2,
      })

      const page2 = await notificationsQueries.listUserNotifications(userId, {
        page: 2,
        limit: 2,
      })

      expect(page1.items.length).toBeLessThanOrEqual(2)
      expect(page1.hasMore).toBe(true)
      expect(page1.items).not.toEqual(page2.items)
    })

    it("should return empty list for user with no notifications", async () => {
      const { user } = await makeUser({
        email: `other-${randomUUID()}@test.local`,
      })

      const result = await notificationsQueries.listUserNotifications(user.id, {
        page: 1,
        limit: 10,
      })

      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it("should order by createdAt descending", async () => {
      const notif1 = await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
        },
      })

      // Wait a tiny bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      const notif2 = await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
        },
      })

      const result = await notificationsQueries.listUserNotifications(userId, {
        page: 1,
        limit: 10,
      })

      expect(result.items[0]?.id).toBe(notif2.id)
      expect(result.items[1]?.id).toBe(notif1.id)
    })
  })

  describe("markAsRead", () => {
    it("should mark notification as read", async () => {
      const notification = await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
        },
      })

      expect(notification.readAt).toBeNull()

      const result = await notificationsQueries.markAsRead(notification.id)

      expect(result.readAt).not.toBeNull()
    })

    it("should update existing readAt if already read", async () => {
      const oldDate = new Date("2024-01-01")
      const notification = await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
          readAt: oldDate,
        },
      })

      const result = await notificationsQueries.markAsRead(notification.id)

      expect(result.readAt).not.toEqual(oldDate)
      expect(result.readAt).not.toBeNull()
    })
  })

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read", async () => {
      // Create unread notifications
      for (let i = 0; i < 3; i++) {
        await db.notification.create({
          data: {
            id: randomUUID(),
            userId,
            type: "KUDO_RECEIVED",
            payload: { kudoId: randomUUID() },
          },
        })
      }

      await notificationsQueries.markAllAsRead(userId)

      const unreadCount = await db.notification.count({
        where: { userId, readAt: null },
      })
      expect(unreadCount).toBe(0)
    })

    it("should not affect already read notifications", async () => {
      const readNotif = await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
          readAt: new Date("2024-01-01"),
        },
      })

      await notificationsQueries.markAllAsRead(userId)

      const updated = await db.notification.findUnique({
        where: { id: readNotif.id },
      })
      expect(updated?.readAt).toEqual(readNotif.readAt)
    })
  })
})
