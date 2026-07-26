import { ErrorCode, type MeResponse } from "@kudos/shared"
import bcrypt from "bcrypt"

import {
  AppError,
  ConflictError,
  UnauthenticatedError,
} from "../../common/errors"
import type { Prisma } from "../../common/prisma-client"
import { db } from "../../common/prisma-client"

import {
  createUserWithPassword,
  findUserByEmail,
  findUserById,
} from "./auth.queries"
import type { LoginInput, RegisterInput } from "./auth.schemas"

const BCRYPT_COST = 12

export const authService = {
  async register(input: RegisterInput): Promise<MeResponse> {
    const existing = await findUserByEmail(input.email)
    if (existing) {
      throw new ConflictError(ErrorCode.EMAIL_TAKEN, "Email already registered")
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
    const user = await db.$transaction((tx: Prisma.TransactionClient) =>
      createUserWithPassword(input.email, input.displayName, passwordHash, tx),
    )
    return toMeResponse(user)
  },

  async login(input: LoginInput): Promise<MeResponse> {
    const user = await findUserByEmail(input.email)
    const identity = user?.authIdentities[0]
    if (!user || !identity?.passwordHash) {
      throw new AppError(
        ErrorCode.INVALID_CREDENTIALS,
        401,
        "Invalid email or password",
      )
    }
    const ok = await bcrypt.compare(input.password, identity.passwordHash)
    if (!ok) {
      throw new AppError(
        ErrorCode.INVALID_CREDENTIALS,
        401,
        "Invalid email or password",
      )
    }
    return toMeResponse(user)
  },

  async getMe(userId: string): Promise<MeResponse> {
    const user = await findUserById(userId)
    if (!user) throw new UnauthenticatedError()
    return toMeResponse(user)
  },
}

function toMeResponse(u: {
  id: string
  email: string
  displayName: string
  role: "EMPLOYEE" | "ADMIN"
  avatarUrl: string | null
  timezone: string
  givingBudgetRemaining: number
  earnedBalance: number
}): MeResponse {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    avatarUrl: u.avatarUrl,
    timezone: u.timezone,
    givingBudgetRemaining: u.givingBudgetRemaining,
    earnedBalance: u.earnedBalance,
  }
}
