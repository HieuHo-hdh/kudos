import bcrypt from "bcrypt"
import { v7 as uuidv7 } from "uuid"

import { db } from "../../src/common/prisma-client"

export async function makeUser(
  overrides: Partial<{
    email: string
    displayName: string
    role: "EMPLOYEE" | "ADMIN"
    password: string
    givingBudgetRemaining: number
    earnedBalance: number
  }> = {},
) {
  const email = overrides.email ?? `user-${uuidv7()}@test.local`
  const password = overrides.password ?? "password123"
  const passwordHash = await bcrypt.hash(password, 4)
  const userId = uuidv7()

  const user = await db.user.create({
    data: {
      id: userId,
      email,
      displayName: overrides.displayName ?? "Test User",
      role: overrides.role ?? "EMPLOYEE",
      givingBudgetRemaining: overrides.givingBudgetRemaining ?? 200,
      earnedBalance: overrides.earnedBalance ?? 0,
    },
  })

  await db.authIdentity.create({
    data: {
      id: uuidv7(),
      userId: user.id,
      provider: "PASSWORD",
      providerUserId: email,
      passwordHash,
    },
  })

  return { user, password }
}
