import { CreateKudoInputSchema, ReactionEmojiEnum } from "@kudos/shared"
import type { Router as ExpressRouter } from "express"
import { Router } from "express"
import { z } from "zod"

import { sendSuccess, sendEmpty } from "../../common/response"
import { requireAuth } from "../../middleware/require-auth"

import { kudosService } from "./kudos.service"

const router = Router()

const listQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
})

const reactionSchema = z.object({
  emoji: ReactionEmojiEnum,
})

const commentSchema = z.object({
  body: z.string().min(1).max(1000),
})

router.get("/", async (req, res, next) => {
  try {
    const parsed = listQuerySchema.parse(req.query)
    const result = await kudosService.listKudos(
      parsed.limit,
      parsed.cursor as string | undefined,
    )
    sendSuccess(res, result)
  } catch (e) {
    next(e)
  }
})

router.get("/:id", async (req, res, next) => {
  try {
    const kudo = await kudosService.getKudoDetail(req.params.id as string)
    sendSuccess(res, kudo)
  } catch (e) {
    next(e)
  }
})

router.post("/", requireAuth(), async (req, res, next) => {
  try {
    const parsed = CreateKudoInputSchema.parse(req.body)
    const kudo = await kudosService.createKudo(
      req.session.userId as string,
      parsed,
    )
    sendSuccess(res, kudo, {
      statusCode: 201,
      message: "Kudo created successfully",
    })
  } catch (e) {
    next(e)
  }
})

router.delete("/:id", requireAuth(), async (req, res, next) => {
  try {
    await kudosService.deleteKudo(
      req.params.id as string,
      req.session.userId as string,
    )
    sendEmpty(res, { message: "Kudo deleted successfully" })
  } catch (e) {
    next(e)
  }
})

router.post("/:id/reactions", requireAuth(), async (req, res, next) => {
  try {
    const parsed = reactionSchema.parse(req.body)
    await kudosService.addReaction(
      req.params.id as string,
      req.session.userId as string,
      parsed.emoji,
    )
    sendEmpty(res, {
      statusCode: 201,
      message: "Reaction added successfully",
    })
  } catch (e) {
    next(e)
  }
})

router.delete(
  "/:id/reactions/:emoji",
  requireAuth(),
  async (req, res, next) => {
    try {
      await kudosService.removeReaction(
        req.params.id as string,
        req.session.userId as string,
        req.params.emoji as string,
      )
      sendEmpty(res, { message: "Reaction removed successfully" })
    } catch (e) {
      next(e)
    }
  },
)

router.get("/:id/reactions", async (req, res, next) => {
  try {
    const reactions = await kudosService.listReactions(req.params.id as string)
    sendSuccess(res, reactions)
  } catch (e) {
    next(e)
  }
})

router.get("/:id/comments", async (req, res, next) => {
  try {
    const comments = await kudosService.listComments(req.params.id as string)
    sendSuccess(res, comments)
  } catch (e) {
    next(e)
  }
})

router.post("/:id/comments", requireAuth(), async (req, res, next) => {
  try {
    const parsed = commentSchema.parse(req.body)
    const comment = await kudosService.addComment(
      req.params.id as string,
      req.session.userId as string,
      parsed.body,
    )
    sendSuccess(res, comment, {
      statusCode: 201,
      message: "Comment added successfully",
    })
  } catch (e) {
    next(e)
  }
})

router.delete(
  "/:id/comments/:commentId",
  requireAuth(),
  async (req, res, next) => {
    try {
      await kudosService.deleteComment(
        req.params.commentId as string,
        req.session.userId as string,
      )
      sendEmpty(res, { message: "Comment deleted successfully" })
    } catch (e) {
      next(e)
    }
  },
)

export const kudosRouter: ExpressRouter = router
