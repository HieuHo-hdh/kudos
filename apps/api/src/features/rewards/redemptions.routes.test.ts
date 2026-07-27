import { randomUUID } from "crypto"

import { describe, it, expect, beforeEach } from "vitest"

import { makeUser } from "../../../test/fixtures/user"
import { makeAgent, XHR } from "../../../test/helpers/http-client"
import { db } from "../../common/prisma-client"
import { redis } from "../../common/redis-client"

describe("Redemptions", () => {
  let agent: ReturnType<typeof makeAgent>
  let userId: string
  let rewardId: string

  beforeEach(async () => {
    agent = makeAgent()
    await redis.flushdb()

    // Create authenticated user with points
    const { user } = await makeUser({
      email: `redeem-${Date.now()}@test.local`,
      password: "testpass123",
      earnedBalance: 1000,
    })
    userId = user.id

    // Login
    await agent.post("/auth/login").set(XHR).send({
      email: user.email,
      password: "testpass123",
    })

    // Create test reward
    const reward = await db.reward.create({
      data: {
        id: randomUUID(),
        name: `Reward ${Date.now()}`,
        description: "Test reward",
        costPoints: 100,
        isActive: true,
        isLimited: true,
        stock: 10,
      },
    })
    rewardId = reward.id
  })

  describe("Issue Idempotency Key", () => {
    it("should issue valid server-issued key", async () => {
      const res = await agent.post("/redemptions/issue-key").set(XHR).send()

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveProperty("idempotencyKey")
      expect(typeof res.body.data.idempotencyKey).toBe("string")
    })

    it("should store key in Redis with 5 min expiry", async () => {
      const res = await agent.post("/redemptions/issue-key").set(XHR).send()
      const key = res.body.data.idempotencyKey

      const storedUserId = await redis.get(`idempotency_key:${key}`)
      expect(storedUserId).toBe(userId)

      const ttl = await redis.ttl(`idempotency_key:${key}`)
      expect(ttl).toBeGreaterThan(290)
      expect(ttl).toBeLessThanOrEqual(300)
    })
  })

  describe("Validation & Error Cases", () => {
    it("should require Idempotency-Key header", async () => {
      const res = await agent
        .post(`/redemptions/${rewardId}/redeem`)
        .set(XHR)
        .send()

      expect(res.status).toBe(400)
      expect(res.body.error.message).toContain("Idempotency-Key")
    })

    it("should reject invalid/missing key", async () => {
      const res = await agent
        .post(`/redemptions/${rewardId}/redeem`)
        .set(XHR)
        .set("Idempotency-Key", "invalid-key")
        .send()

      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe("INVALID_IDEMPOTENCY_KEY")
    })

    it("should prevent redemption with insufficient points", async () => {
      // Set user to have only 50 points (need 100)
      await db.user.update({
        where: { id: userId },
        data: { earnedBalance: 50 },
      })

      const keyRes = await agent.post("/redemptions/issue-key").set(XHR).send()

      const res = await agent
        .post(`/redemptions/${rewardId}/redeem`)
        .set(XHR)
        .set("Idempotency-Key", keyRes.body.data.idempotencyKey)
        .send()

      expect(res.status).toBe(500)
    })

    it("should prevent redemption when reward out of stock", async () => {
      await db.reward.update({
        where: { id: rewardId },
        data: { stock: 0 },
      })

      const keyRes = await agent.post("/redemptions/issue-key").set(XHR).send()

      const res = await agent
        .post(`/redemptions/${rewardId}/redeem`)
        .set(XHR)
        .set("Idempotency-Key", keyRes.body.data.idempotencyKey)
        .send()

      expect(res.status).toBe(500)
    })

    it("should prevent redemption of inactive reward", async () => {
      await db.reward.update({
        where: { id: rewardId },
        data: { isActive: false },
      })

      const keyRes = await agent.post("/redemptions/issue-key").set(XHR).send()

      const res = await agent
        .post(`/redemptions/${rewardId}/redeem`)
        .set(XHR)
        .set("Idempotency-Key", keyRes.body.data.idempotencyKey)
        .send()

      expect(res.status).toBe(500)
    })
  })
})
