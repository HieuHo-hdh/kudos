import type { ListKudosResponse } from "@kudos/shared"
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query"

import { kudosApi } from "../kudos.api"

export function useInfiniteKudos() {
  return useInfiniteQuery<
    ListKudosResponse,
    Error,
    InfiniteData<ListKudosResponse>,
    ["kudos", "feed"],
    string | undefined
  >({
    queryKey: ["kudos", "feed"],
    queryFn: async ({ pageParam }) => {
      return await kudosApi.listKudos(10, pageParam as string | undefined)
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.cursor ? lastPage.cursor : undefined,
    staleTime: 30_000,
  })
}
