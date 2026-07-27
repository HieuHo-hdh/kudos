import bcrypt from "bcrypt"
import { v7 as uuidv7 } from "uuid"

import type { Prisma } from "../src/index"
import { db } from "../src/index"

const BCRYPT_COST = 12

async function main() {
  console.warn("Seeding database…")

  const users = [
    {
      email: "admin@test.local",
      displayName: "Admin Adminson",
      role: "ADMIN" as const,
      password: "adminpass123",
    },
    {
      email: "alice@test.local",
      displayName: "Alice Nguyen",
      password: "password123",
    },
    {
      email: "bob@test.local",
      displayName: "Bob Tran",
      password: "password123",
    },
    {
      email: "charlie@test.local",
      displayName: "Charlie Le",
      password: "password123",
    },
    {
      email: "diana@test.local",
      displayName: "Diana Pham",
      password: "password123",
    },
    { email: "eve@test.local", displayName: "Eve Vo", password: "password123" },
  ]

  for (const u of users) {
    const userId = uuidv7()
    const hash = await bcrypt.hash(u.password, BCRYPT_COST)

    await db.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: userId,
          email: u.email,
          displayName: u.displayName,
          role: u.role ?? "EMPLOYEE",
          timezone: "Asia/Ho_Chi_Minh",
        },
      })

      const user = await tx.user.findUniqueOrThrow({
        where: { email: u.email },
      })

      await tx.authIdentity.upsert({
        where: {
          userId_provider: { userId: user.id, provider: "PASSWORD" },
        },
        update: { passwordHash: hash },
        create: {
          id: uuidv7(),
          userId: user.id,
          provider: "PASSWORD",
          providerUserId: u.email,
          passwordHash: hash,
        },
      })
    })

    console.warn(`  user: ${u.email}`)
  }

  const rewards: Prisma.RewardCreateInput[] = [
    {
      id: uuidv7(),
      name: "Company Hoodie",
      description: "Cozy branded hoodie, sizes S–XXL.",
      costPoints: 50,
      isLimited: true,
      stock: 20,
      imageUrl: null,
    },
    {
      id: uuidv7(),
      name: "Friday Afternoon Off",
      description: "One PTO half-day, use within 30 days.",
      costPoints: 30,
      isLimited: false,
      stock: 10,
      imageUrl: null,
    },
    {
      id: uuidv7(),
      name: "Coffee for a Week",
      description: "5 x company café credits.",
      costPoints: 20,
      isLimited: true,
      stock: 50,
      imageUrl: null,
    },
  ]

  for (const r of rewards) {
    await db.reward.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    })
    console.warn(`  reward: ${r.name}`)
  }

  console.warn("Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
