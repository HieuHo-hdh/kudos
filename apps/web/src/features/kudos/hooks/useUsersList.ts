import type { UserDetail } from "@kudos/shared"
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query"

import { apiFetch } from "../../../common/api/client"

interface UsersListResponse {
  items: UserDetail[]
  hasMore: boolean
  cursor: string | null
}

export function useUsersList(search: string) {
  return useInfiniteQuery<
    UsersListResponse,
    Error,
    InfiniteData<UsersListResponse>,
    ["users", "list", string],
    string | undefined
  >({
    queryKey: ["users", "list", search],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      params.append("limit", "10")
      params.append("active", "true")
      if (search) params.append("search", search)
      if (pageParam) params.append("cursor", pageParam as string)

      return await apiFetch<UsersListResponse>(`/users?${params.toString()}`)
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.cursor ? lastPage.cursor : undefined,
    enabled: search.length > 0,
    staleTime: 10_000,
  })
}
