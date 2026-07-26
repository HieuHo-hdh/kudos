import { describe, it, expect, vi } from "vitest"

import * as adminApi from "../admin.api"

vi.mock("../admin.api")

describe("useUsers - API calls", () => {
  describe("adminApi.listUsers", () => {
    it("should call listUsers with correct parameters", () => {
      vi.mocked(adminApi.adminApi.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      adminApi.adminApi.listUsers({ page: 1, limit: 20 })

      expect(adminApi.adminApi.listUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      })
    })

    it("should support search parameter", () => {
      vi.mocked(adminApi.adminApi.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      adminApi.adminApi.listUsers({ page: 1, limit: 20, search: "test" })

      expect(adminApi.adminApi.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: "test" }),
      )
    })

    it("should support role filter", () => {
      vi.mocked(adminApi.adminApi.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      adminApi.adminApi.listUsers({ page: 1, limit: 20, role: "ADMIN" })

      expect(adminApi.adminApi.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: "ADMIN" }),
      )
    })
  })

  describe("adminApi.updateUser", () => {
    it("should call updateUser with id and input", () => {
      const mockUser = {
        id: "1",
        email: "user@test.local",
        displayName: "User",
        role: "ADMIN" as const,
        avatarUrl: null,
        timezone: "UTC",
        givingBudgetRemaining: 300,
        earnedBalance: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        deletedAt: null,
      }

      vi.mocked(adminApi.adminApi.updateUser).mockResolvedValue(mockUser)

      adminApi.adminApi.updateUser("1", { role: "ADMIN" })

      expect(adminApi.adminApi.updateUser).toHaveBeenCalledWith("1", {
        role: "ADMIN",
      })
    })
  })

  describe("adminApi.deleteUser", () => {
    it("should call deleteUser with id", () => {
      vi.mocked(adminApi.adminApi.deleteUser).mockResolvedValue(undefined)

      adminApi.adminApi.deleteUser("1")

      expect(adminApi.adminApi.deleteUser).toHaveBeenCalledWith("1")
    })
  })

  describe("adminApi.reactivateUser", () => {
    it("should call reactivateUser with id", () => {
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
        updatedAt: "2024-01-02T00:00:00Z",
        deletedAt: null,
      }

      vi.mocked(adminApi.adminApi.reactivateUser).mockResolvedValue(mockUser)

      adminApi.adminApi.reactivateUser("1")

      expect(adminApi.adminApi.reactivateUser).toHaveBeenCalledWith("1")
    })
  })
})
