import { HeartOutlined } from "@ant-design/icons"
import { Card, Space, Spin, Empty, Grid, Button } from "antd"
import { useEffect, useRef, useCallback, useState } from "react"

import { AdminLayout } from "../../user"
import { GiveKudoModal } from "../components/GiveKudoModal"
import { KudoCard } from "../components/KudoCard"
import { useInfiniteKudos } from "../hooks/useInfiniteKudos"

export function KudosPage() {
  const screens = Grid.useBreakpoint()
  const [modalOpen, setModalOpen] = useState(false)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteKudos()
  const observerTarget = useRef<HTMLDivElement>(null)

  const gridCols = screens.lg ? 2 : screens.sm ? 1 : 1

  const handleObserve = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserve, {
      rootMargin: "100px",
    })

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [handleObserve])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Empty
        description={`Error loading kudos: ${error.message}`}
        style={{ marginTop: 60 }}
      />
    )
  }

  const kudos = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <AdminLayout breadcrumbs={[{ title: "Kudos" }]}>
      <Card>
        <Space className="w-full" direction="vertical" size="large">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Kudos Feed</h1>
            <Button
              onClick={() => setModalOpen(true)}
              type="primary"
              icon={<HeartOutlined />}
            >
              Give Kudos
            </Button>
          </div>
          {kudos?.length > 0 ? (
            <>
              <GiveKudoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
              />
              <div className={`grid gap-6 grid-cols-${gridCols}`}>
                {kudos.map((kudo) => (
                  <KudoCard key={kudo.id} kudo={kudo} />
                ))}
              </div>

              <div ref={observerTarget} className="py-8 text-center">
                {isFetchingNextPage && <Spin size="large" />}
                {!hasNextPage && kudos.length > 0 && (
                  <p className="text-gray-400 text-sm">No more kudos</p>
                )}
              </div>
            </>
          ) : (
            <Empty description="No kudos yet" style={{ marginTop: 60 }} />
          )}
        </Space>
      </Card>
    </AdminLayout>
  )
}
