import { randomUUID } from "crypto"

import { describe, it, expect, beforeEach } from "vitest"

import { makeUser } from "../../../test/fixtures/user"
import { db } from "../../common/prisma-client"

import { rewardsQueries } from "./rewards.queries"

describe("Rewards Queries", () => {
  let userId: string

  beforeEach(async () => {
    const { user } = await makeUser({
      email: `user-${Date.now()}@test.local`,
      password: "testpass123",
    })
    userId = user.id
  })

  describe("listRewards", () => {
    it("should list all rewards with pagination", async () => {
      // Create test rewards
      for (let i = 0; i < 3; i++) {
        await db.reward.create({
          data: {
            id: randomUUID(),
            name: `Reward ${i}`,
            description: "Test reward",
            costPoints: 50 + i * 10,
            isActive: true,
            isLimited: false,
            imageUrl: null,
          },
        })
      }

      const result = await rewardsQueries.listRewards({
        page: 1,
        limit: 10,
      })

      expect(result.items.length).toBeGreaterThanOrEqual(3)
      expect(result.total).toBeGreaterThanOrEqual(3)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it("should filter by isActive status", async () => {
      const active = await db.reward.create({
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

      const inactive = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Inactive Reward",
          description: "Unavailable",
          costPoints: 100,
          isActive: false,
          isLimited: false,
          imageUrl: null,
        },
      })

      const activeResults = await rewardsQueries.listRewards({
        page: 1,
        limit: 10,
        isActive: true,
      })

      expect(activeResults.items.some((r) => r.id === active.id)).toBe(true)
      expect(activeResults.items.some((r) => r.id === inactive.id)).toBe(false)
    })

    it("should search rewards by name", async () => {
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

      await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Lunch Ticket",
          description: "Free lunch",
          costPoints: 100,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const result = await rewardsQueries.listRewards({
        page: 1,
        limit: 10,
        search: "Coffee",
      })

      expect(result.items).toContainEqual(
        expect.objectContaining({ name: "Coffee Voucher" }),
      )
      expect(result.items.some((r) => r.name === "Lunch Ticket")).toBe(false)
    })

    it("should search rewards by description", async () => {
      await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Mystery Item",
          description: "Free weekend pass",
          costPoints: 500,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const result = await rewardsQueries.listRewards({
        page: 1,
        limit: 10,
        search: "weekend",
      })

      expect(result.items).toContainEqual(
        expect.objectContaining({ name: "Mystery Item" }),
      )
    })

    it("should handle pagination correctly", async () => {
      // Create 5 rewards
      for (let i = 0; i < 5; i++) {
        await db.reward.create({
          data: {
            id: randomUUID(),
            name: `Item ${i}`,
            description: "Test",
            costPoints: 50,
            isActive: true,
            isLimited: false,
            imageUrl: null,
          },
        })
      }

      const page1 = await rewardsQueries.listRewards({
        page: 1,
        limit: 2,
      })

      const page2 = await rewardsQueries.listRewards({
        page: 2,
        limit: 2,
      })

      expect(page1.items.length).toBeLessThanOrEqual(2)
      expect(page2.items.length).toBeLessThanOrEqual(2)
      expect(page1.items).not.toEqual(page2.items)
    })

    it("should calculate hasMore correctly", async () => {
      for (let i = 0; i < 3; i++) {
        await db.reward.create({
          data: {
            id: randomUUID(),
            name: `Item ${i}`,
            description: "Test",
            costPoints: 50,
            isActive: true,
            isLimited: false,
            imageUrl: null,
          },
        })
      }

      const page1 = await rewardsQueries.listRewards({
        page: 1,
        limit: 2,
      })

      expect(page1.hasMore).toBe(true)

      const page2 = await rewardsQueries.listRewards({
        page: 2,
        limit: 2,
      })

      expect(page2.hasMore).toBe(false)
    })
  })

  describe("getRewardDetail", () => {
    it("should retrieve reward by id", async () => {
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

      const result = await rewardsQueries.getRewardDetail(reward.id)

      expect(result).toMatchObject({
        id: reward.id,
        name: "Test Reward",
        costPoints: 75,
        isLimited: true,
        stock: 10,
      })
    })

    it("should throw for nonexistent reward", async () => {
      const nonexistentId = randomUUID()

      await expect(
        rewardsQueries.getRewardDetail(nonexistentId),
      ).rejects.toThrow()
    })
  })

  describe("createReward", () => {
    it("should create reward with all fields", async () => {
      const input = {
        name: "New Coffee Voucher",
        description: "Free premium coffee",
        costPoints: 50,
        isActive: true,
        isLimited: false,
        imageUrl: null,
      }

      const result = await rewardsQueries.createReward(input)

      expect(result).toMatchObject(input)
      expect(result.id).toBeDefined()

      // Verify persisted
      const persisted = await db.reward.findUnique({
        where: { id: result.id },
      })
      expect(persisted).not.toBeNull()
    })

    it("should create limited reward with stock", async () => {
      const input = {
        name: "Limited Edition Item",
        description: "Only 5 available",
        costPoints: 200,
        isActive: true,
        isLimited: true,
        stock: 5,
        imageUrl: null,
      }

      const result = await rewardsQueries.createReward(input)

      expect(result.isLimited).toBe(true)
      expect(result.stock).toBe(5)
    })

    it("should handle unlimited rewards without explicit stock", async () => {
      const input = {
        name: "Unlimited Reward",
        description: "Available forever",
        costPoints: 100,
        isActive: true,
        isLimited: false,
        imageUrl: null,
      }

      const result = await rewardsQueries.createReward(input)

      expect(result.isLimited).toBe(false)
      // Unlimited rewards use default stock value when not specified
      expect(result.stock).toBe(1)
    })
  })

  describe("updateReward", () => {
    it("should update reward properties", async () => {
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

      const result = await rewardsQueries.updateReward(reward.id, {
        name: "Updated Name",
        costPoints: 75,
      })

      expect(result.name).toBe("Updated Name")
      expect(result.costPoints).toBe(75)
      expect(result.description).toBe("Original description")
    })

    it("should update active status", async () => {
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

      const result = await rewardsQueries.updateReward(reward.id, {
        isActive: false,
      })

      expect(result.isActive).toBe(false)
    })

    it("should update stock for limited rewards", async () => {
      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Limited Item",
          description: "Limited",
          costPoints: 100,
          isActive: true,
          isLimited: true,
          stock: 10,
          imageUrl: null,
        },
      })

      const result = await rewardsQueries.updateReward(reward.id, {
        stock: 5,
      })

      expect(result.stock).toBe(5)
    })

    it("should throw for nonexistent reward", async () => {
      const nonexistentId = randomUUID()

      await expect(
        rewardsQueries.updateReward(nonexistentId, { name: "Updated" }),
      ).rejects.toThrow()
    })
  })

  describe("deleteReward", () => {
    it("should delete reward", async () => {
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

      const result = await rewardsQueries.deleteReward(reward.id)

      expect(result.id).toBe(reward.id)

      // Verify deletion
      const deleted = await db.reward.findUnique({
        where: { id: reward.id },
      })
      expect(deleted).toBeNull()
    })

    it("should throw for nonexistent reward", async () => {
      const nonexistentId = randomUUID()

      await expect(rewardsQueries.deleteReward(nonexistentId)).rejects.toThrow()
    })
  })

  describe("listAllRedemptions", () => {
    it("should list all redemptions with pagination", async () => {
      // Create reward and redemptions
      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Test Reward",
          description: "Test",
          costPoints: 100,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      for (let i = 0; i < 2; i++) {
        await db.redemption.create({
          data: {
            id: randomUUID(),
            userId,
            rewardId: reward.id,
            costPoints: 100,
            idempotencyKey: randomUUID(),
            status: "PENDING",
          },
        })
      }

      const result = await rewardsQueries.listAllRedemptions({
        page: 1,
        limit: 10,
      })

      expect(result.items.length).toBeGreaterThanOrEqual(2)
      expect(result.total).toBeGreaterThanOrEqual(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it("should handle pagination for redemptions", async () => {
      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Test Reward",
          description: "Test",
          costPoints: 100,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      for (let i = 0; i < 3; i++) {
        await db.redemption.create({
          data: {
            id: randomUUID(),
            userId,
            rewardId: reward.id,
            costPoints: 100,
            idempotencyKey: randomUUID(),
            status: "PENDING",
          },
        })
      }

      const page1 = await rewardsQueries.listAllRedemptions({
        page: 1,
        limit: 2,
      })

      expect(page1.items.length).toBeLessThanOrEqual(2)
      expect(page1.hasMore).toBe(true)
    })
  })

  describe("listUserRedemptions", () => {
    it("should list user's redemptions", async () => {
      const { user: otherUser } = await makeUser({
        email: `other-${Date.now()}@test.local`,
      })

      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Test Reward",
          description: "Test",
          costPoints: 100,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      // Create redemptions for both users
      await db.redemption.create({
        data: {
          id: randomUUID(),
          userId,
          rewardId: reward.id,
          costPoints: 100,
          idempotencyKey: randomUUID(),
          status: "PENDING",
        },
      })

      await db.redemption.create({
        data: {
          id: randomUUID(),
          userId: otherUser.id,
          rewardId: reward.id,
          costPoints: 100,
          idempotencyKey: randomUUID(),
          status: "PENDING",
        },
      })

      const result = await rewardsQueries.listUserRedemptions(userId, {
        page: 1,
        limit: 10,
      })

      expect(result.items.length).toBe(1)
      expect(result.items[0]?.userId).toBe(userId)
    })

    it("should return empty list for user with no redemptions", async () => {
      const { user: newUser } = await makeUser({
        email: `new-${Date.now()}@test.local`,
      })

      const result = await rewardsQueries.listUserRedemptions(newUser.id, {
        page: 1,
        limit: 10,
      })

      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it("should respect pagination for user redemptions", async () => {
      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Test Reward",
          description: "Test",
          costPoints: 100,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      for (let i = 0; i < 5; i++) {
        await db.redemption.create({
          data: {
            id: randomUUID(),
            userId,
            rewardId: reward.id,
            costPoints: 100,
            idempotencyKey: randomUUID(),
            status: "PENDING",
          },
        })
      }

      const page1 = await rewardsQueries.listUserRedemptions(userId, {
        page: 1,
        limit: 2,
      })

      expect(page1.items.length).toBeLessThanOrEqual(2)
      expect(page1.total).toBe(5)
      expect(page1.hasMore).toBe(true)
    })
  })

  describe("fulfillRedemption", () => {
    it("should fulfill pending redemption", async () => {
      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Test Reward",
          description: "Test",
          costPoints: 100,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const redemption = await db.redemption.create({
        data: {
          id: randomUUID(),
          userId,
          rewardId: reward.id,
          costPoints: 100,
          idempotencyKey: randomUUID(),
          status: "PENDING",
        },
      })

      const result = await rewardsQueries.fulfillRedemption(redemption.id)

      expect(result.status).toBe("FULFILLED")
      expect(result.fulfilledAt).not.toBeNull()
    })
  })

  describe("cancelRedemption", () => {
    it("should cancel redemption with reason", async () => {
      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Test Reward",
          description: "Test",
          costPoints: 100,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const redemption = await db.redemption.create({
        data: {
          id: randomUUID(),
          userId,
          rewardId: reward.id,
          costPoints: 100,
          idempotencyKey: randomUUID(),
          status: "PENDING",
        },
      })

      const result = await rewardsQueries.cancelRedemption(
        redemption.id,
        "Out of stock",
      )

      expect(result.status).toBe("CANCELLED")
      expect(result.cancelReason).toBe("Out of stock")
    })

    it("should cancel redemption without reason", async () => {
      const reward = await db.reward.create({
        data: {
          id: randomUUID(),
          name: "Test Reward",
          description: "Test",
          costPoints: 100,
          isActive: true,
          isLimited: false,
          imageUrl: null,
        },
      })

      const redemption = await db.redemption.create({
        data: {
          id: randomUUID(),
          userId,
          rewardId: reward.id,
          costPoints: 100,
          idempotencyKey: randomUUID(),
          status: "PENDING",
        },
      })

      const result = await rewardsQueries.cancelRedemption(redemption.id)

      expect(result.status).toBe("CANCELLED")
    })
  })
})
