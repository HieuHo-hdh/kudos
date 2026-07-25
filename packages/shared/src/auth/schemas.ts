import { z } from "zod"

export const LoginInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
})

export type LoginInput = z.infer<typeof LoginInputSchema>

export const RegisterInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(200),
  displayName: z.string().min(1).max(80),
})

export type RegisterInput = z.infer<typeof RegisterInputSchema>

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
  avatarUrl: z.string().nullable(),
  timezone: z.string(),
  givingBudgetRemaining: z.number().int(),
  earnedBalance: z.number().int(),
})

export type MeResponse = z.infer<typeof MeResponseSchema>
