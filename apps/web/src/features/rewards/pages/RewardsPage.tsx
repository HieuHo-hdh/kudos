import type { ListRewardsQuery } from "@kudos/shared"
import { Button, Card, Empty, Pagination, Spin } from "antd"
import { useState } from "react"

import { DebouncedSearch } from "../../../common/components/DebouncedSearch"
import { useCreateRedemption, useMyRedemptions } from "../hooks/useRedemptions"
import { useRewardsList } from "../hooks/useRewards"

export function RewardsPage() {
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })

  const query: ListRewardsQuery = {
    page: pagination.page,
    limit: pagination.limit,
    ...(search && { search }),
  }

  const { data, isLoading } = useRewardsList(query)
  const { mutate: createRedemption, isPending } = useCreateRedemption()
  const { data: myRedemptions } = useMyRedemptions({
    page: 1,
    limit: 100,
  })

  const pendingRedemptions = new Set(
    myRedemptions?.items
      ?.filter((r) => r.status === "PENDING")
      .map((r) => r.rewardId),
  )

  const handleRedeemReward = (rewardId: string) => {
    createRedemption(rewardId)
  }

  if (isLoading) return <Spin fullscreen />

  if (!data?.items || data.items.length === 0) {
    return <Empty description="No rewards available" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Available Rewards</h1>
        <DebouncedSearch
          placeholder="Search rewards..."
          value={search}
          onChange={setSearch}
          className="w-full"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.items.map((reward) => (
          <Card key={reward.id} hoverable>
            {reward.imageUrl && (
              <img
                src={reward.imageUrl}
                alt={reward.name}
                className="mb-4 h-48 w-full object-cover"
              />
            )}
            <h3 className="mb-2 text-lg font-semibold">{reward.name}</h3>
            <p className="mb-4 text-sm text-gray-600">{reward.description}</p>
            <div className="mb-4 flex justify-between text-sm">
              <span className="font-semibold">{reward.costPoints} points</span>
              <span className="text-gray-600">Stock: {reward.stock}</span>
            </div>
            <Button
              type="primary"
              block
              disabled={reward.stock === 0 || pendingRedemptions.has(reward.id)}
              loading={isPending}
              onClick={() => handleRedeemReward(reward.id)}
            >
              {pendingRedemptions.has(reward.id) ? "Pending" : "Redeem"}
            </Button>
          </Card>
        ))}
      </div>

      {data.total > pagination.limit && (
        <Pagination
          current={pagination.page}
          total={data.total}
          pageSize={pagination.limit}
          onChange={(page) => setPagination({ ...pagination, page })}
          className="text-center"
        />
      )}
    </div>
  )
}
