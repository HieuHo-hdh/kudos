# Data Table Pattern Guide

This guide documents the reusable pattern used in ManageUsersPage that can be applied to other pages requiring data tables with search, filters, and CRUD operations.

## Pattern Overview

The pattern consists of:

1. Query state management (pagination, filters, search)
2. API hooks with React Query for data fetching and mutations
3. Debounced search for better UX
4. Mutation success/error notifications
5. Responsive table layout with dropdown actions
6. Modal confirmations for destructive actions

## Key Components

### 1. State Management

```tsx
const [pagination, setPagination] = useState({ page: 1, limit: 20 })
const [filters, setFilters] = useState<
  Partial<Pick<Query, "role" | "active" | "search">>
>({})
```

### 2. API Hooks Pattern

```tsx
// hooks/useXxx.ts
const queryKeys = {
  app: {
    resource: {
      list: (query: Partial<Query> = {}) =>
        ["app", "resource", "list", query.page, query.limit, query.role, ...] as const,
      detail: (id: string) => ["app", "resource", id] as const,
    },
  },
}

export function useXxxList(query: Query) {
  return useQuery({
    queryKey: queryKeys.app.resource.list(query),
    queryFn: () => api.listXxx(query),
    staleTime: 30_000,
  })
}

export function useUpdateXxx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => api.updateXxx(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["app", "resource", "list"] })
    },
  })
}
```

### 3. Search Input

```tsx
<DebouncedSearch
  placeholder="Search..."
  value={filters.search || ""}
  onChange={(value) => setFilters({ ...filters, search: value || undefined })}
  maxLength={50}
  debounceMs={500}
  allowClear
/>
```

### 4. Filters

```tsx
<Select
  placeholder="Filter by status"
  value={filters.status || undefined}
  onChange={(value) => setFilters({ ...filters, status: value || undefined })}
  options={[{ label: "Active", value: "active" }]}
  allowClear
/>
```

### 5. Mutations with Notifications

```tsx
const handleUpdate = async (input: UpdateInput) => {
  try {
    await updateMutation.mutateAsync({ id, input })
    message.success("Item updated successfully")
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Failed to update")
  }
}
```

### 6. Table with Actions

```tsx
const columns = [
  { title: "Email", dataIndex: "email", key: "email", width: 200 },
  {
    title: "Actions",
    key: "actions",
    width: 80,
    fixed: "right" as const,
    render: (_, record) => (
      <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
        <Button type="text" size="small" icon={<MoreOutlined />} />
      </Dropdown>
    ),
  },
]
```

### 7. Pagination

```tsx
<Table
  pagination={{
    current: pagination.page,
    pageSize: pagination.limit,
    total: data?.total || 0,
    onChange: (page) => setPagination({ page, limit: pagination.limit }),
    onShowSizeChange: (_, pageSize) =>
      setPagination({ page: 1, limit: pageSize }),
  }}
/>
```

## Best Practices

1. **Query Key Structure**: Flatten query parameters in the key array

   ```tsx
   ["app", "resource", "list", query.page, query.limit, query.role, ...]
   ```

2. **Invalidation**: Use partial key matching to invalidate all variations

   ```tsx
   qc.invalidateQueries({ queryKey: ["app", "resource", "list"] })
   ```

3. **Debounced Search**: Use 500ms debounce to reduce API calls

   ```tsx
   debounceMs={500}
   ```

4. **Row Highlighting**: Style rows based on record state

   ```tsx
   rowClassName={(record) => record.deleted ? "!bg-red-50" : ""}
   ```

5. **Loading States**: Combine all mutation loading states

   ```tsx
   loading={isLoading || mutation1.isPending || mutation2.isPending}
   ```

6. **Responsive Design**: Use flex-wrap for mobile
   ```tsx
   className = "flex flex-wrap gap-2 flex-wrap md:flex-nowrap"
   ```

## Implementation Checklist

- [ ] Create query hooks with proper queryKeys
- [ ] Add DebouncedSearch component
- [ ] Add filter dropdowns
- [ ] Configure table columns with actions
- [ ] Add mutation handlers with try-catch
- [ ] Add success/error message notifications
- [ ] Add confirmation modals for destructive actions
- [ ] Add loading states to buttons
- [ ] Test at 360px, 768px, and 1440px viewport widths
- [ ] Write unit tests for hooks and components
