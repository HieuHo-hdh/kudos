import { Input } from "antd"
import type { InputProps } from "antd"
import { useEffect, useState } from "react"

interface DebouncedSearchProps extends Omit<InputProps, "onChange"> {
  value?: string
  onChange?: (value: string) => void
  debounceMs?: number
}

export function DebouncedSearch({
  value = "",
  onChange,
  debounceMs = 300,
  ...props
}: DebouncedSearchProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange?.(localValue)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, onChange, debounceMs])

  return (
    <Input.Search
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
    />
  )
}
