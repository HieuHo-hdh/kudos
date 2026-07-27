import type {
  CreateRedemptionInput,
  CreateRewardInput,
  ListRedemptionsQuery,
  ListRewardsQuery,
  Redemption,
  Reward,
  UpdateRewardInput,
} from "@kudos/shared"

import { apiFetch } from "../../common/api/client"

export const rewardsApi = {
  issueIdempotencyKey: async () => {
    return apiFetch<{ idempotencyKey: string }>("/redemptions/issue-key", {
      method: "POST",
    })
  },

  listRewards: async (query: ListRewardsQuery) => {
    const params = new URLSearchParams({
      page: query.page.toString(),
      limit: query.limit.toString(),
      ...(query.search && { search: query.search }),
      ...(query.isActive !== undefined && {
        isActive: query.isActive.toString(),
      }),
    })
    return apiFetch<{
      items: Reward[]
      total: number
      page: number
      limit: number
      hasMore: boolean
    }>(`/rewards?${params.toString()}`)
  },

  getRewardDetail: async (id: string) => {
    return apiFetch<Reward>(`/rewards/${id}`)
  },

  createReward: async (input: CreateRewardInput) => {
    return apiFetch<Reward>("/rewards", { method: "POST", body: input })
  },

  updateReward: async (id: string, input: UpdateRewardInput) => {
    return apiFetch<Reward>(`/rewards/${id}`, {
      method: "PATCH",
      body: input,
    })
  },

  deleteReward: async (id: string) => {
    return apiFetch<void>(`/rewards/${id}`, { method: "DELETE" })
  },

  listAllRedemptions: async (query: ListRedemptionsQuery) => {
    const params = new URLSearchParams({
      page: query.page.toString(),
      limit: query.limit.toString(),
    })
    return apiFetch<{
      items: Redemption[]
      total: number
      page: number
      limit: number
      hasMore: boolean
    }>(`/redemptions?${params.toString()}`)
  },

  listMyRedemptions: async (query: ListRedemptionsQuery) => {
    const params = new URLSearchParams({
      page: query.page.toString(),
      limit: query.limit.toString(),
    })
    return apiFetch<{
      items: Redemption[]
      total: number
      page: number
      limit: number
      hasMore: boolean
    }>(`/redemptions/my-redemptions?${params.toString()}`)
  },

  createRedemption: async (rewardId: string, idempotencyKey: string) => {
    return apiFetch<Redemption>(`/redemptions/${rewardId}/redeem`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    })
  },

  fulfillRedemption: async (redemptionId: string) => {
    return apiFetch<Redemption>(`/redemptions/${redemptionId}/fulfill`, {
      method: "PATCH",
      body: {},
    })
  },

  cancelRedemption: async (
    redemptionId: string,
    input: CreateRedemptionInput,
  ) => {
    return apiFetch<Redemption>(`/redemptions/${redemptionId}/cancel`, {
      method: "PATCH",
      body: input,
    })
  },
}
