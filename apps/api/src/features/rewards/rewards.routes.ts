import {
  CreateRewardInput,
  ListRewardsQuery,
  UpdateRewardInput,
} from "@kudos/shared"
import { Router, type Router as RouterType } from "express"

import { sendEmpty, sendSuccess } from "../../common/response"
import { requireAuth } from "../../middleware/require-auth"
import { requireRole } from "../../middleware/require-role"

import { rewardsService } from "./rewards.service"

export const rewardsRouter: RouterType = Router()

rewardsRouter.use(requireAuth())

// Rewards - List rewards (public)
rewardsRouter.get("/", async (req, res, next) => {
  try {
    const parsed = ListRewardsQuery.parse(req.query)
    const result = await rewardsService.listRewards(parsed)
    sendSuccess(res, result)
  } catch (e) {
    next(e)
  }
})

// Rewards - Create reward (admin only)
rewardsRouter.post("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = CreateRewardInput.parse(req.body)
    const reward = await rewardsService.createReward(parsed)
    sendSuccess(res, reward, { message: "Reward created successfully" })
  } catch (e) {
    next(e)
  }
})

// Rewards - Get reward detail (public)
rewardsRouter.get("/:id", async (req, res, next) => {
  try {
    const reward = await rewardsService.getRewardDetail(req.params.id)
    sendSuccess(res, reward)
  } catch (e) {
    next(e)
  }
})

// Rewards - Update reward (admin only)
rewardsRouter.patch("/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = UpdateRewardInput.parse(req.body)
    const reward = await rewardsService.updateReward(
      req.params.id as string,
      parsed,
    )
    sendSuccess(res, reward, { message: "Reward updated successfully" })
  } catch (e) {
    next(e)
  }
})

// Rewards - Delete reward (admin only)
rewardsRouter.delete("/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    await rewardsService.deleteReward(req.params.id as string)
    sendEmpty(res, { message: "Reward deleted successfully" })
  } catch (e) {
    next(e)
  }
})
