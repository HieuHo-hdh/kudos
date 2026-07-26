import { z } from "zod"

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(["EMPLOYEE", "ADMIN"]).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v ? v === "true" : undefined)),
  search: z.string().trim().optional(),
})

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>

export const UserDetailSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
  avatarUrl: z.string().nullable(),
  timezone: z.string(),
  givingBudgetRemaining: z.number().int(),
  earnedBalance: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})

export type UserDetail = z.infer<typeof UserDetailSchema>

export const UpdateUserInputSchema = z.object({
  role: z.enum(["EMPLOYEE", "ADMIN"]).optional(),
  active: z.boolean().optional(),
  givingBudgetRemaining: z.number().int().nonnegative().optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>

export const ListUsersResponseSchema = z.object({
  items: z.array(UserDetailSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
})

export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>
