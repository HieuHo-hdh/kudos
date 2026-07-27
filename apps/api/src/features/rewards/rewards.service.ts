import { randomUUID } from "crypto"

import type {
  CreateRewardInput,
  ListRedemptionsQuery,
  ListRewardsQuery,
  UpdateRewardInput,
} from "@kudos/shared"

import { rewardsQueries } from "./rewards.queries"

export const rewardsService = {
  listRewards: (query: ListRewardsQuery) => {
    return rewardsQueries.listRewards(query)
  },

  getRewardDetail: (id: string) => {
    return rewardsQueries.getRewardDetail(id)
  },

  createReward: (input: CreateRewardInput) => {
    return rewardsQueries.createReward(input)
  },

  updateReward: (id: string, input: UpdateRewardInput) => {
    return rewardsQueries.updateReward(id, input)
  },

  deleteReward: (id: string) => {
    return rewardsQueries.deleteReward(id)
  },

  listAllRedemptions: (query: ListRedemptionsQuery) => {
    return rewardsQueries.listAllRedemptions(query)
  },

  listUserRedemptions: (userId: string, query: ListRedemptionsQuery) => {
    return rewardsQueries.listUserRedemptions(userId, query)
  },

  createRedemption: (userId: string, rewardId: string) => {
    return rewardsQueries.createRedemption(userId, rewardId, randomUUID())
  },

  fulfillRedemption: (id: string) => {
    return rewardsQueries.fulfillRedemption(id)
  },

  cancelRedemption: (id: string, reason?: string) => {
    return rewardsQueries.cancelRedemption(id, reason)
  },
}
