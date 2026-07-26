import { describe, it, expect, beforeEach, vi } from "vitest"

import * as adminService from "./admin.service"

vi.mock("./admin.service")

describe("Admin Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /admin/users", () => {
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

      vi.mocked(adminService.adminService.listUsers).mockResolvedValue({
        items: mockUsers,
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      const result = await adminService.adminService.listUsers({
        page: 1,
        limit: 20,
      })

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.items[0]?.email).toBe("user1@test.local")
    })

    it("should filter users by role", async () => {
      vi.mocked(adminService.adminService.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      await adminService.adminService.listUsers({
        page: 1,
        limit: 20,
        role: "ADMIN",
      })

      expect(adminService.adminService.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: "ADMIN" }),
      )
    })

    it("should search users by email or name", async () => {
      vi.mocked(adminService.adminService.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      await adminService.adminService.listUsers({
        page: 1,
        limit: 20,
        search: "test",
      })

      expect(adminService.adminService.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: "test" }),
      )
    })
  })

  describe("PUT /admin/users/:id", () => {
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

      vi.mocked(adminService.adminService.updateUser).mockResolvedValue(
        updatedUser,
      )

      const result = await adminService.adminService.updateUser(
        "1",
        { role: "ADMIN", givingBudgetRemaining: 300 },
        "admin-id",
      )

      expect(result.role).toBe("ADMIN")
      expect(result.givingBudgetRemaining).toBe(300)
    })

    it("should prevent self role edit", async () => {
      vi.mocked(adminService.adminService.updateUser).mockRejectedValue(
        new Error("Cannot change your own role"),
      )

      await expect(
        adminService.adminService.updateUser(
          "user-1",
          { role: "EMPLOYEE" },
          "user-1",
        ),
      ).rejects.toThrow("Cannot change your own role")
    })
  })

  describe("DELETE /admin/users/:id", () => {
    it("should soft delete user", async () => {
      vi.mocked(adminService.adminService.deleteUser).mockResolvedValue(
        undefined,
      )

      await expect(
        adminService.adminService.deleteUser("user-1", "admin-id"),
      ).resolves.toBeUndefined()
    })

    it("should prevent self delete", async () => {
      vi.mocked(adminService.adminService.deleteUser).mockRejectedValue(
        new Error("Cannot delete your own account"),
      )

      await expect(
        adminService.adminService.deleteUser("user-1", "user-1"),
      ).rejects.toThrow("Cannot delete your own account")
    })
  })

  describe("PATCH /admin/users/:id/reactivate", () => {
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

      vi.mocked(adminService.adminService.reactivateUser).mockResolvedValue(
        reactivatedUser,
      )

      const result = await adminService.adminService.reactivateUser("1")

      expect(result.deletedAt).toBeNull()
    })
  })
})
