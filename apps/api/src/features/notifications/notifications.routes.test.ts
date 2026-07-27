import { randomUUID } from "crypto"

import { describe, it, expect, beforeEach } from "vitest"

import { makeUser } from "../../../test/fixtures/user"
import { makeAgent, XHR } from "../../../test/helpers/http-client"
import { db } from "../../common/prisma-client"
import { redis } from "../../common/redis-client"

describe("Notifications Routes", () => {
  let agent: ReturnType<typeof makeAgent>
  let userId: string
  let userEmail: string
  let userPassword: string

  beforeEach(async () => {
    agent = makeAgent()
    await redis.flushdb()

    userPassword = "testpass123"
    userEmail = `user-${randomUUID()}@test.local`
    const { user } = await makeUser({
      email: userEmail,
      password: userPassword,
    })
    userId = user.id
  })

  describe("List Notifications - GET /", () => {
    it("should require authentication", async () => {
      const res = await agent.get("/notifications").set(XHR)

      expect(res.status).toBe(401)
    })

    it("should list user notifications", async () => {
      await agent.post("/auth/login").set(XHR).send({
        email: userEmail,
        password: userPassword,
      })

      // Create test notification
      await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID(), points: 100 },
        },
      })

      const res = await agent.get("/notifications").set(XHR)

      expect(res.status).toBe(200)
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data.items[0]).toMatchObject({
        userId,
        type: "KUDO_RECEIVED",
      })
    })

    it("should filter unread notifications only", async () => {
      await agent.post("/auth/login").set(XHR).send({
        email: userEmail,
        password: userPassword,
      })

      // Create unread notification
      const unreadNotif = await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
        },
      })

      // Create read notification
      await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
          readAt: new Date(),
        },
      })

      const res = await agent
        .get("/notifications")
        .set(XHR)
        .query({ unreadOnly: "true" })

      expect(res.status).toBe(200)
      expect(res.body.data.items).toContainEqual(
        expect.objectContaining({ id: unreadNotif.id, readAt: null }),
      )
      expect(res.body.data.items).not.toContainEqual(
        expect.objectContaining({ readAt: expect.any(String) }),
      )
    })

    it("should support pagination", async () => {
      await agent.post("/auth/login").set(XHR).send({
        email: userEmail,
        password: userPassword,
      })

      const res = await agent
        .get("/notifications")
        .set(XHR)
        .query({ page: 1, limit: 10 })

      expect(res.status).toBe(200)
      expect(res.body.data.page).toBe(1)
      expect(res.body.data.limit).toBe(10)
    })
  })

  describe("Mark As Read - PATCH /:id/read", () => {
    it("should require authentication", async () => {
      const res = await agent
        .patch(`/notifications/${randomUUID()}/read`)
        .set(XHR)

      expect(res.status).toBe(401)
    })

    it("should mark notification as read", async () => {
      await agent.post("/auth/login").set(XHR).send({
        email: userEmail,
        password: userPassword,
      })

      const notification = await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: { kudoId: randomUUID() },
        },
      })

      expect(notification.readAt).toBeNull()

      const res = await agent
        .patch(`/notifications/${notification.id}/read`)
        .set(XHR)

      expect(res.status).toBe(200)
      expect(res.body.data.readAt).not.toBeNull()

      // Verify in database
      const updated = await db.notification.findUnique({
        where: { id: notification.id },
      })
      expect(updated?.readAt).not.toBeNull()
    })
  })

  describe("Mark All As Read - PATCH /mark-all-as-read", () => {
    it("should require authentication", async () => {
      const res = await agent.patch("/notifications/mark-all-as-read").set(XHR)

      expect(res.status).toBe(401)
    })

    it("should mark all unread notifications as read", async () => {
      await agent.post("/auth/login").set(XHR).send({
        email: userEmail,
        password: userPassword,
      })

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

      const res = await agent.patch("/notifications/mark-all-as-read").set(XHR)

      expect(res.status).toBe(204)

      // Verify all marked as read
      const unreadCount = await db.notification.count({
        where: { userId, readAt: null },
      })
      expect(unreadCount).toBe(0)
    })
  })

  describe("Notification Types", () => {
    it("should handle KUDO_RECEIVED notification payload", async () => {
      await agent.post("/auth/login").set(XHR).send({
        email: userEmail,
        password: userPassword,
      })

      await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "KUDO_RECEIVED",
          payload: {
            kudoId: randomUUID(),
            giverId: randomUUID(),
            message: "Great work!",
            points: 100,
          },
        },
      })

      const res = await agent.get("/notifications").set(XHR)

      expect(res.status).toBe(200)
      expect(res.body.data.items[0]).toMatchObject({
        type: "KUDO_RECEIVED",
        payload: expect.objectContaining({
          message: "Great work!",
          points: 100,
        }),
      })
    })

    it("should handle REDEMPTION_STATUS notification payload", async () => {
      await agent.post("/auth/login").set(XHR).send({
        email: userEmail,
        password: userPassword,
      })

      await db.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: "REDEMPTION_STATUS",
          payload: {
            redemptionId: randomUUID(),
            rewardId: randomUUID(),
            status: "FULFILLED",
            costPoints: 200,
          },
        },
      })

      const res = await agent.get("/notifications").set(XHR)

      expect(res.status).toBe(200)
      expect(res.body.data.items[0]).toMatchObject({
        type: "REDEMPTION_STATUS",
        payload: expect.objectContaining({
          status: "FULFILLED",
          costPoints: 200,
        }),
      })
    })
  })
})
