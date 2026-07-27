import { describe, it, expect, vi } from "vitest"

import * as userApi from "../user.api"

vi.mock("../user.api")

describe("useUsers - API calls", () => {
  describe("userApi.listUsers", () => {
    it("should call listUsers with correct parameters", () => {
      vi.mocked(userApi.userApi.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      userApi.userApi.listUsers({ page: 1, limit: 20 })

      expect(userApi.userApi.listUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      })
    })

    it("should support search parameter", () => {
      vi.mocked(userApi.userApi.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      userApi.userApi.listUsers({ page: 1, limit: 20, search: "test" })

      expect(userApi.userApi.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: "test" }),
      )
    })

    it("should support role filter", () => {
      vi.mocked(userApi.userApi.listUsers).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      })

      userApi.userApi.listUsers({ page: 1, limit: 20, role: "ADMIN" })

      expect(userApi.userApi.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: "ADMIN" }),
      )
    })
  })

  describe("userApi.updateUser", () => {
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

      vi.mocked(userApi.userApi.updateUser).mockResolvedValue(mockUser)

      userApi.userApi.updateUser("1", { role: "ADMIN" })

      expect(userApi.userApi.updateUser).toHaveBeenCalledWith("1", {
        role: "ADMIN",
      })
    })
  })

  describe("userApi.deleteUser", () => {
    it("should call deleteUser with id", () => {
      vi.mocked(userApi.userApi.deleteUser).mockResolvedValue(undefined)

      userApi.userApi.deleteUser("1")

      expect(userApi.userApi.deleteUser).toHaveBeenCalledWith("1")
    })
  })

  describe("userApi.reactivateUser", () => {
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

      vi.mocked(userApi.userApi.reactivateUser).mockResolvedValue(mockUser)

      userApi.userApi.reactivateUser("1")

      expect(userApi.userApi.reactivateUser).toHaveBeenCalledWith("1")
    })
  })
})
