import { CreateRedemptionInput, ListRedemptionsQuery } from "@kudos/shared"
import { Router, type Router as RouterType } from "express"

import { sendSuccess } from "../../common/response"
import { requireAuth } from "../../middleware/require-auth"
import { requireRole } from "../../middleware/require-role"

import { rewardsService } from "./rewards.service"

export const redemptionsRouter: RouterType = Router()

redemptionsRouter.use(requireAuth())

// Redemptions - List all (admin only)
redemptionsRouter.get("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = ListRedemptionsQuery.parse(req.query)
    const result = await rewardsService.listAllRedemptions(parsed)
    sendSuccess(res, result)
  } catch (e) {
    next(e)
  }
})

// Redemptions - List user's redemptions
redemptionsRouter.get("/my-redemptions", async (req, res, next) => {
  try {
    const parsed = ListRedemptionsQuery.parse(req.query)
    const result = await rewardsService.listUserRedemptions(
      req.session.userId as string,
      parsed,
    )
    sendSuccess(res, result)
  } catch (e) {
    next(e)
  }
})

// Redemptions - Fulfill redemption (admin only)
redemptionsRouter.patch(
  "/:id/fulfill",
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const redemption = await rewardsService.fulfillRedemption(
        req.params.id as string,
      )
      sendSuccess(res, redemption, {
        message: "Redemption fulfilled successfully",
      })
    } catch (e) {
      next(e)
    }
  },
)

// Redemptions - Cancel redemption (admin only)
redemptionsRouter.patch(
  "/:id/cancel",
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const parsed = CreateRedemptionInput.parse(req.body)
      const redemption = await rewardsService.cancelRedemption(
        req.params.id as string,
        parsed.reason,
      )
      sendSuccess(res, redemption, {
        message: "Redemption cancelled successfully",
      })
    } catch (e) {
      next(e)
    }
  },
)

// Redemptions - Create redemption (user redeems a reward)
redemptionsRouter.post("/:rewardId/redeem", async (req, res, next) => {
  try {
    const redemption = await rewardsService.createRedemption(
      req.session.userId as string,
      req.params.rewardId,
    )
    sendSuccess(res, redemption, {
      message: "Reward redeemed successfully",
    })
  } catch (e) {
    next(e)
  }
})
