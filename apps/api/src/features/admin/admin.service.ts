import {
  ErrorCode,
  type ListUsersQuery,
  type UpdateUserInput,
} from "@kudos/shared"

import { ForbiddenError, NotFoundError } from "../../common/errors"

import * as adminQueries from "./admin.queries"

export const adminService = {
  async listUsers(query: ListUsersQuery) {
    return adminQueries.listUsers(query)
  },

  async getUserDetail(id: string) {
    const user = await adminQueries.findUserById(id)
    if (!user) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, `User ${id} not found`)
    }
    return user
  },

  async updateUser(id: string, input: UpdateUserInput, currentUserId: string) {
    const user = await adminQueries.findUserById(id)
    if (!user) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, `User ${id} not found`)
    }

    if (input.role && id === currentUserId) {
      throw new ForbiddenError(
        ErrorCode.SELF_ROLE_EDIT_FORBIDDEN,
        "Cannot change your own role",
      )
    }

    if (
      input.givingBudgetRemaining !== undefined &&
      input.givingBudgetRemaining < 0
    ) {
      throw new Error("Giving budget cannot be negative")
    }

    return adminQueries.updateUser(id, {
      role: input.role,
      givingBudgetRemaining: input.givingBudgetRemaining,
    })
  },

  async deleteUser(id: string, currentUserId: string) {
    const user = await adminQueries.findUserById(id)
    if (!user) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, `User ${id} not found`)
    }

    if (id === currentUserId) {
      throw new ForbiddenError(
        ErrorCode.SELF_DELETE_FORBIDDEN,
        "Cannot delete your own account",
      )
    }

    await adminQueries.softDeleteUser(id)
  },

  async reactivateUser(id: string) {
    const user = await adminQueries.findDeletedUserById(id)
    if (!user) {
      throw new NotFoundError(
        ErrorCode.NOT_FOUND,
        `User ${id} not found or is not deleted`,
      )
    }
    return adminQueries.reactivateUser(id)
  },
}
