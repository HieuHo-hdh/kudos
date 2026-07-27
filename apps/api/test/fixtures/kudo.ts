import { v7 as uuidv7 } from "uuid"

import { db } from "../../src/common/prisma-client"

export async function makeKudo(
  overrides: Partial<{
    senderId: string
    recipientId: string
    points: number
    message: string
    coreValue:
      "TEAMWORK" | "OWNERSHIP" | "INNOVATION" | "CUSTOMER_FIRST" | "INTEGRITY"
  }> = {},
) {
  const senderId = overrides.senderId || uuidv7()
  const recipientId = overrides.recipientId || uuidv7()

  const kudo = await db.kudo.create({
    data: {
      id: uuidv7(),
      senderId,
      recipientId,
      points: overrides.points ?? 20,
      message: overrides.message ?? "Great work!",
      coreValue: overrides.coreValue ?? "TEAMWORK",
      idempotencyKey: uuidv7(),
    },
  })

  return kudo
}

export async function makeReaction(
  kudoId: string,
  userId: string,
  emoji: string,
) {
  const reaction = await db.reaction.create({
    data: {
      id: uuidv7(),
      kudoId,
      userId,
      emoji,
    },
  })

  return reaction
}
