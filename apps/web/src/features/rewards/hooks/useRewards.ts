import type {
  CreateRewardInput,
  ListRewardsQuery,
  UpdateRewardInput,
} from "@kudos/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { rewardsApi } from "../rewards.api"

const REWARDS_KEY = "rewards"

export function useRewardsList(query: ListRewardsQuery) {
  return useQuery({
    queryKey: [REWARDS_KEY, "list", query],
    queryFn: () => rewardsApi.listRewards(query),
  })
}

export function useRewardDetail(id: string) {
  return useQuery({
    queryKey: [REWARDS_KEY, "detail", id],
    queryFn: () => rewardsApi.getRewardDetail(id),
  })
}

export function useCreateReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateRewardInput) => rewardsApi.createReward(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] })
    },
  })
}

export function useUpdateReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRewardInput }) =>
      rewardsApi.updateReward(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] })
    },
  })
}

export function useDeleteReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => rewardsApi.deleteReward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] })
    },
  })
}
