import { v7 as uuidv7 } from "uuid"

import type { Prisma } from "../../common/prisma-client";
import { db } from "../../common/prisma-client"

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    include: {
      authIdentities: {
        where: { provider: "PASSWORD" },
        take: 1,
      },
    },
  })
}

export async function findUserById(id: string) {
  return db.user.findUnique({ where: { id } })
}

export async function createUserWithPassword(
  email: string,
  displayName: string,
  passwordHash: string,
  tx: Prisma.TransactionClient = db,
) {
  const userId = uuidv7()
  const user = await tx.user.create({
    data: {
      id: userId,
      email,
      displayName,
      role: "EMPLOYEE",
      timezone: "Asia/Ho_Chi_Minh",
    },
  })
  await tx.authIdentity.create({
    data: {
      id: uuidv7(),
      userId: user.id,
      provider: "PASSWORD",
      providerUserId: email,
      passwordHash,
    },
  })
  return user
}
