import { randomUUID } from "crypto"

import { CreateRedemptionInput, ListRedemptionsQuery } from "@kudos/shared"
import { Router, type Router as RouterType } from "express"

import { redis } from "../../common/redis-client"
import { sendSuccess } from "../../common/response"
import { requireAuth } from "../../middleware/require-auth"
import { requireRole } from "../../middleware/require-role"

import { rewardsService } from "./rewards.service"

export const redemptionsRouter: RouterType = Router()

redemptionsRouter.use(requireAuth())

// Redemptions - Issue idempotency key (server-issued, prevents manual API usage)
redemptionsRouter.post("/issue-key", async (req, res, next) => {
  try {
    const userId = req.session.userId as string
    const idempotencyKey = randomUUID()
    const keyPrefix = `idempotency_key:${idempotencyKey}`

    // Store key in Redis with 5 minute expiry
    // Format: idempotency_key:{key} -> {userId}
    await redis.setex(keyPrefix, 300, userId)

    sendSuccess(res, { idempotencyKey })
  } catch (e) {
    next(e)
  }
})

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
    const userId = req.session.userId as string
    const idempotencyKey = req.headers["idempotency-key"] as string

    if (!idempotencyKey) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Idempotency-Key header is required",
        },
      })
    }

    // Verify key was issued to this user
    const keyPrefix = `idempotency_key:${idempotencyKey}`
    const issuedUserId = await redis.get(keyPrefix)

    if (!issuedUserId) {
      return res.status(401).json({
        error: {
          code: "INVALID_IDEMPOTENCY_KEY",
          message:
            "Idempotency key is invalid or expired. Please request a new one.",
        },
      })
    }

    if (issuedUserId !== userId) {
      return res.status(403).json({
        error: {
          code: "IDEMPOTENCY_KEY_MISMATCH",
          message: "Idempotency key does not belong to current user",
        },
      })
    }

    // Delete key after successful validation (one-time use)
    await redis.del(keyPrefix)

    const redemption = await rewardsService.createRedemption(
      userId,
      req.params.rewardId,
      idempotencyKey,
    )
    sendSuccess(res, redemption, {
      message: "Reward redeemed successfully",
    })
  } catch (e) {
    next(e)
  }
})
