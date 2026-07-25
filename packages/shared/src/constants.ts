export const MONTHLY_GIVING_BUDGET = 200
export const MIN_KUDO_POINTS = 10
export const MAX_KUDO_POINTS = 50
export const MAX_VIDEO_SECONDS = 180
export const MAX_VIDEO_BYTES = 500_000_000
export const MAX_IMAGE_BYTES = 20_000_000
export const MAX_MEDIA_PER_KUDO = 5
export const COMPANY_TIMEZONE = "Asia/Ho_Chi_Minh"

export const CORE_VALUES = [
  "TEAMWORK",
  "OWNERSHIP",
  "INNOVATION",
  "CUSTOMER_FIRST",
  "INTEGRITY",
] as const

export type CoreValue = (typeof CORE_VALUES)[number]
