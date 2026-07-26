import type { ListUsersQuery, UpdateUserInput, UserDetail } from "@kudos/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { adminApi } from "../admin.api"

const queryKeys = {
  admin: {
    users: {
      list: (query: Partial<ListUsersQuery> = {}) =>
        [
          "admin",
          "users",
          "list",
          query.page,
          query.limit,
          query.role,
          query.active,
          query.search,
        ] as const,
      detail: (id: string) => ["admin", "users", id] as const,
    },
  },
}

export function useUsersList(query: ListUsersQuery) {
  return useQuery({
    queryKey: queryKeys.admin.users.list(query),
    queryFn: () => adminApi.listUsers(query),
    staleTime: 30_000,
  })
}

export function useUserDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.users.detail(id || ""),
    queryFn: () => adminApi.getUserDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation<UserDetail, Error, { id: string; input: UpdateUserInput }>(
    {
      mutationFn: ({ id, input }) => adminApi.updateUser(id, input),
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: ["admin", "users", "list"] })
        qc.setQueryData(queryKeys.admin.users.detail(data.id), data)
      },
    },
  )
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users", "list"] })
    },
  })
}

export function useReactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.reactivateUser(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin", "users", "list"] })
      qc.setQueryData(queryKeys.admin.users.detail(data.id), data)
    },
  })
}
