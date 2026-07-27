import { randomUUID } from "crypto"

import { describe, it, expect, beforeEach } from "vitest"

import { makeUser } from "../../../test/fixtures/user"
import { makeAgent, XHR } from "../../../test/helpers/http-client"
import { db } from "../../common/prisma-client"
import { redis } from "../../common/redis-client"

describe("Rewards Routes", () => {
  let agent: ReturnType<typeof makeAgent>

  beforeEach(async () => {
    agent = makeAgent()
    await redis.flushdb()
  })

  describe("List Rewards - GET /", () => {
    it("should require authentication", async () => {
      const res = await agent.get("/rewards").set(XHR)

      expect(res.status).toBe(401)
    })

    it("should list all active rewards", async () => {
      const { user } = await makeUser({
        email: `user-${randomUUID()}@test.local`,
        password: "testpass123",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      // Create test rewards
      await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Coffee Voucher",
          description: "Free coffee",
          costPoints: 50,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const res = await agent.get("/rewards").set(XHR)

      expect(res.status).toBe(200)
      expect(res.body.data.items).toContainEqual(
        expect.objectContaining({ name: "Coffee Voucher" }),
      )
    })

    it("should filter rewards by isActive status", async () => {
      const { user } = await makeUser({
        email: `user-${randomUUID()}@test.local`,
        password: "testpass123",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Active Reward",
          description: "Available",
          costPoints: 50,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Inactive Reward",
          description: "Not available",
          costPoints: 100,
          isActive: false,
          isLimited: false,
          imageUrl: null,
        },
      })

      const res = await agent
        .get("/rewards")
        .set(XHR)
        .query({ isActive: "true" })

      expect(res.status).toBe(200)
      expect(res.body.data.items).toContainEqual(
        expect.objectContaining({ name: "Active Reward" }),
      )
      expect(
        res.body.data.items.some(
          (r: { name: string }) => r.name === "Inactive Reward",
        ),
      ).toBe(false)
    })

    it("should support pagination", async () => {
      const { user } = await makeUser({
        email: `user-${randomUUID()}@test.local`,
        password: "testpass123",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const res = await agent
        .get("/rewards")
        .set(XHR)
        .query({ page: 1, limit: 10 })

      expect(res.status).toBe(200)
      expect(res.body.data.page).toBe(1)
      expect(res.body.data.limit).toBe(10)
    })
  })

  describe("Get Reward Detail - GET /:id", () => {
    it("should require authentication", async () => {
      const res = await agent.get("/rewards/nonexistent").set(XHR)

      expect(res.status).toBe(401)
    })

    it("should retrieve reward by id", async () => {
      const { user } = await makeUser({
        email: `user-${randomUUID()}@test.local`,
        password: "testpass123",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Test Reward",
          description: "A test reward",
          costPoints: 75,
          isActive: true,
          isLimited: true,
          stock: 10,
          imageUrl: null,
        },
      })

      const res = await agent.get(`/rewards/${reward.id}`).set(XHR)

      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({
        id: reward.id,
        name: "Test Reward",
        costPoints: 75,
      })
    })
  })

  describe("Create Reward - POST /", () => {
    it("should require admin role", async () => {
      const { user } = await makeUser({
        email: `user-${randomUUID()}@test.local`,
        password: "testpass123",
        role: "EMPLOYEE",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const res = await agent.post("/rewards").set(XHR).send({
        name: "New Reward",
        description: "Test",
        costPoints: 50,
        isActive: true,
        isLimited: false,
        imageUrl: null,
      })

      expect(res.status).toBe(403)
    })

    it("should create reward as admin", async () => {
      const { user } = await makeUser({
        email: `admin-${randomUUID()}@test.local`,
        password: "testpass123",
        role: "ADMIN",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const res = await agent.post("/rewards").set(XHR).send({
        name: "New Coffee Voucher",
        description: "Free premium coffee",
        costPoints: 50,
        isActive: true,
        isLimited: false,
        imageUrl: null,
      })

      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({
        name: "New Coffee Voucher",
        costPoints: 50,
      })
      expect(res.body.data.id).toBeDefined()
    })

    it("should create limited reward with stock", async () => {
      const { user } = await makeUser({
        email: `admin-${randomUUID()}@test.local`,
        password: "testpass123",
        role: "ADMIN",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const res = await agent.post("/rewards").set(XHR).send({
        name: "Limited Edition",
        description: "Only 5 available",
        costPoints: 200,
        isActive: true,
        isLimited: true,
        stock: 5,
        imageUrl: null,
      })

      expect(res.status).toBe(200)
      expect(res.body.data.isLimited).toBe(true)
      expect(res.body.data.stock).toBe(5)
    })
  })

  describe("Update Reward - PATCH /:id", () => {
    it("should require admin role", async () => {
      const { user } = await makeUser({
        email: `user-${randomUUID()}@test.local`,
        password: "testpass123",
        role: "EMPLOYEE",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Original",
          description: "Test",
          costPoints: 50,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const res = await agent.patch(`/rewards/${reward.id}`).set(XHR).send({
        name: "Updated",
      })

      expect(res.status).toBe(403)
    })

    it("should update reward as admin", async () => {
      const { user } = await makeUser({
        email: `admin-${randomUUID()}@test.local`,
        password: "testpass123",
        role: "ADMIN",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Original Name",
          description: "Original description",
          costPoints: 50,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const res = await agent.patch(`/rewards/${reward.id}`).set(XHR).send({
        name: "Updated Name",
        costPoints: 75,
      })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe("Updated Name")
      expect(res.body.data.costPoints).toBe(75)
    })

    it("should toggle reward active status", async () => {
      const { user } = await makeUser({
        email: `admin-${randomUUID()}@test.local`,
        password: "testpass123",
        role: "ADMIN",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Test Reward",
          description: "Test",
          costPoints: 50,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const res = await agent.patch(`/rewards/${reward.id}`).set(XHR).send({
        isActive: false,
      })

      expect(res.status).toBe(200)
      expect(res.body.data.isActive).toBe(false)
    })
  })

  describe("Delete Reward - DELETE /:id", () => {
    it("should require admin role", async () => {
      const { user } = await makeUser({
        email: `user-${randomUUID()}@test.local`,
        password: "testpass123",
        role: "EMPLOYEE",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "To Delete",
          description: "Test",
          costPoints: 50,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const res = await agent.delete(`/rewards/${reward.id}`).set(XHR)

      expect(res.status).toBe(403)
    })

    it("should delete reward as admin", async () => {
      const { user } = await makeUser({
        email: `admin-${randomUUID()}@test.local`,
        password: "testpass123",
        role: "ADMIN",
      })

      await agent.post("/auth/login").set(XHR).send({
        email: user.email,
        password: "testpass123",
      })

      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "To Delete",
          description: "Test",
          costPoints: 50,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const res = await agent.delete(`/rewards/${reward.id}`).set(XHR)

      expect(res.status).toBe(204)

      const deleted = await db.reward.findUnique({
        where: { id: reward.id },
      })
      expect(deleted).toBeNull()
    })
  })
})
