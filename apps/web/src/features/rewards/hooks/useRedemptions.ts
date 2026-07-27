import type { CreateRedemptionInput, ListRedemptionsQuery } from "@kudos/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { rewardsApi } from "../rewards.api"

const REDEMPTIONS_KEY = "redemptions"
const REWARDS_KEY = "rewards"
const USER_KEY = "user"

export function useRedemptionsList(query: ListRedemptionsQuery) {
  return useQuery({
    queryKey: [REDEMPTIONS_KEY, "list", query],
    queryFn: () => rewardsApi.listAllRedemptions(query),
  })
}

export function useMyRedemptions(query: ListRedemptionsQuery) {
  return useQuery({
    queryKey: [REDEMPTIONS_KEY, "my", query],
    queryFn: () => rewardsApi.listMyRedemptions(query),
  })
}

export function useCreateRedemption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rewardId: string) => {
      // Get server-issued idempotency key
      const { idempotencyKey } = await rewardsApi.issueIdempotencyKey()
      return rewardsApi.createRedemption(rewardId, idempotencyKey)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REDEMPTIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] })
      queryClient.invalidateQueries({ queryKey: [USER_KEY] })
    },
  })
}

export function useFulfillRedemption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (redemptionId: string) =>
      rewardsApi.fulfillRedemption(redemptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REDEMPTIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] })
    },
  })
}

export function useCancelRedemption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateRedemptionInput }) =>
      rewardsApi.cancelRedemption(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REDEMPTIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] })
    },
  })
}
