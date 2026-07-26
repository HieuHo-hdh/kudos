import type { MeResponse } from "@kudos/shared"
import { useQuery } from "@tanstack/react-query"

import { apiFetch } from "../api/client"
import { queryKeys } from "../api/queryKeys"

export function useCurrentUser() {
  return useQuery<MeResponse | null>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await apiFetch<MeResponse>("/auth/me")
      } catch (e) {
        if (
          e instanceof Error &&
          e.name === "ApiError" &&
          (e as { status?: number }).status === 401
        ) {
          return null
        }
        throw e
      }
    },
    staleTime: 60_000,
  })
}
