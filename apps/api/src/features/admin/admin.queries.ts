import type { ListUsersQuery, UserDetail } from "@kudos/shared"

import type { Prisma } from "../../common/prisma-client"
import { db } from "../../common/prisma-client"

export async function listUsers(query: ListUsersQuery) {
  const skip = (query.page - 1) * query.limit
  const take = query.limit

  const where: Prisma.UserWhereInput = {}

  if (query.role) {
    where.role = query.role
  }

  if (query.active !== undefined) {
    where.deletedAt = query.active ? null : { not: null }
  }

  if (query.search) {
    const searchLower = query.search.toLowerCase()
    where.OR = [
      { email: { contains: searchLower, mode: "insensitive" } },
      { displayName: { contains: searchLower, mode: "insensitive" } },
    ]
  }

  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        avatarUrl: true,
        timezone: true,
        givingBudgetRemaining: true,
        earnedBalance: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    db.user.count({ where }),
  ])

  return {
    items: items.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      deletedAt: u.deletedAt?.toISOString() || null,
    })) as UserDetail[],
    total,
    page: query.page,
    limit: query.limit,
    hasMore: skip + items.length < total,
  }
}

export async function findUserById(id: string) {
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      avatarUrl: true,
      timezone: true,
      givingBudgetRemaining: true,
      earnedBalance: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  })
  if (!user) return null
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() || null,
  } as UserDetail
}

export async function updateUser(
  id: string,
  data: {
    role?: "EMPLOYEE" | "ADMIN"
    givingBudgetRemaining?: number
  },
) {
  const user = await db.user.update({
    where: { id },
    data: {
      ...(data.role && { role: data.role }),
      ...(data.givingBudgetRemaining !== undefined && {
        givingBudgetRemaining: data.givingBudgetRemaining,
      }),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      avatarUrl: true,
      timezone: true,
      givingBudgetRemaining: true,
      earnedBalance: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  })
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() || null,
  } as UserDetail
}

export async function softDeleteUser(id: string) {
  await db.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function findDeletedUserById(id: string) {
  const user = await db.user.findFirst({
    where: { id, deletedAt: { not: null } },
  })
  return user ? true : false
}

export async function reactivateUser(id: string) {
  const user = await db.user.update({
    where: { id },
    data: { deletedAt: null },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      avatarUrl: true,
      timezone: true,
      givingBudgetRemaining: true,
      earnedBalance: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  })
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() || null,
  } as UserDetail
}
