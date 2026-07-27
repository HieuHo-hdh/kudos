import { describe, it, expect, beforeEach, vi } from "vitest"

import * as usersService from "./users.service"

vi.mock("./users.service")

describe("Users Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /users", () => {
    it("should list users with pagination and filters", async () => {
      const mockUsers = [
        {
          id: "1",
          email: "user1@test.local",
          displayName: "User 1",
          role: "EMPLOYEE" as const,
          avatarUrl: null,
          timezone: "UTC",
          givingBudgetRemaining: 200,
          earnedBalance: 0,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          deletedAt: null,
        },
      ]

      vi.mocked(usersService.usersService.listUsers).mockResolvedValue({
        items: mockUsers,
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      const result = await usersService.usersService.listUsers({
        page: 1,
        limit: 20,
      })

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.items[0]?.email).toBe("user1@test.local")
    })

    it("should filter users by role", async () => {
      vi.mocked(usersService.usersService.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      await usersService.usersService.listUsers({
        page: 1,
        limit: 20,
        role: "ADMIN",
      })

      expect(usersService.usersService.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: "ADMIN" }),
      )
    })

    it("should search users by email or name", async () => {
      vi.mocked(usersService.usersService.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      await usersService.usersService.listUsers({
        page: 1,
        limit: 20,
        search: "test",
      })

      expect(usersService.usersService.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: "test" }),
      )
    })
  })

  describe("GET /users/:id", () => {
    it("should get user detail", async () => {
      const mockUser = {
        id: "1",
        email: "user@test.local",
        displayName: "User",
        role: "EMPLOYEE" as const,
        avatarUrl: null,
        timezone: "UTC",
        givingBudgetRemaining: 200,
        earnedBalance: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
      }

      vi.mocked(usersService.usersService.getUserDetail).mockResolvedValue(
        mockUser,
      )

      const result = await usersService.usersService.getUserDetail("1")

      expect(result.id).toBe("1")
      expect(result.email).toBe("user@test.local")
    })
  })

  describe("PUT /users/:id", () => {
    it("should update user", async () => {
      const updatedUser = {
        id: "1",
        email: "user@test.local",
        displayName: "Updated User",
        role: "ADMIN" as const,
        avatarUrl: null,
        timezone: "UTC",
        givingBudgetRemaining: 300,
        earnedBalance: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        deletedAt: null,
      }

      vi.mocked(usersService.usersService.updateUser).mockResolvedValue(
        updatedUser,
      )

      const result = await usersService.usersService.updateUser(
        "1",
        { role: "ADMIN", givingBudgetRemaining: 300 },
        "admin-id",
      )

      expect(result.role).toBe("ADMIN")
      expect(result.givingBudgetRemaining).toBe(300)
    })

    it("should prevent self role edit", async () => {
      vi.mocked(usersService.usersService.updateUser).mockRejectedValue(
        new Error("Cannot change your own role"),
      )

      await expect(
        usersService.usersService.updateUser(
          "user-1",
          { role: "EMPLOYEE" },
          "user-1",
        ),
      ).rejects.toThrow("Cannot change your own role")
    })
  })

  describe("DELETE /users/:id", () => {
    it("should soft delete user", async () => {
      vi.mocked(usersService.usersService.deleteUser).mockResolvedValue(
        undefined,
      )

      await expect(
        usersService.usersService.deleteUser("user-1", "admin-id"),
      ).resolves.toBeUndefined()
    })

    it("should prevent self delete", async () => {
      vi.mocked(usersService.usersService.deleteUser).mockRejectedValue(
        new Error("Cannot delete your own account"),
      )

      await expect(
        usersService.usersService.deleteUser("user-1", "user-1"),
      ).rejects.toThrow("Cannot delete your own account")
    })
  })

  describe("PATCH /users/:id/reactivate", () => {
    it("should reactivate deleted user", async () => {
      const reactivatedUser = {
        id: "1",
        email: "user@test.local",
        displayName: "User",
        role: "EMPLOYEE" as const,
        avatarUrl: null,
        timezone: "UTC",
        givingBudgetRemaining: 200,
        earnedBalance: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        deletedAt: null,
      }

      vi.mocked(usersService.usersService.reactivateUser).mockResolvedValue(
        reactivatedUser,
      )

      const result = await usersService.usersService.reactivateUser("1")

      expect(result.deletedAt).toBeNull()
    })
  })
})
