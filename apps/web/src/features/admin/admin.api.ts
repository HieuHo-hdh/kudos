import type {
  ListUsersQuery,
  ListUsersResponse,
  UpdateUserInput,
  UserDetail,
} from "@kudos/shared"

import { apiFetch } from "../../common/api/client"

export const adminApi = {
  listUsers: (query: ListUsersQuery): Promise<ListUsersResponse> => {
    const params = new URLSearchParams()
    params.append("page", query.page.toString())
    params.append("limit", query.limit.toString())
    if (query.role) params.append("role", query.role)
    if (query.active !== undefined)
      params.append("active", query.active.toString())
    if (query.search) params.append("search", query.search)
    return apiFetch<ListUsersResponse>(`/admin/users?${params}`)
  },

  getUserDetail: (id: string) => apiFetch<UserDetail>(`/admin/users/${id}`),

  updateUser: (id: string, input: UpdateUserInput) =>
    apiFetch<UserDetail>(`/admin/users/${id}`, {
      method: "PUT",
      body: input,
    }),

  deleteUser: (id: string) =>
    apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" }),

  reactivateUser: (id: string) =>
    apiFetch<UserDetail>(`/admin/users/${id}/reactivate`, {
      method: "PATCH",
    }),
}
