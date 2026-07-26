export const queryKeys = {
  me: ["me"] as const,

  users: {
    all: ["users"] as const,
    byId: (id: string) => ["users", id] as const,
  },

  feed: ["feed"] as const,

  kudos: {
    all: ["kudos"] as const,
    detail: (id: string) => ["kudos", id] as const,
    reactions: (id: string) => ["kudos", id, "reactions"] as const,
    comments: (id: string) => ["kudos", id, "comments"] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    list: ["notifications", "list"] as const,
    unreadCount: ["notifications", "unreadCount"] as const,
  },

  rewards: {
    all: ["rewards"] as const,
    list: ["rewards", "list"] as const,
    detail: (id: string) => ["rewards", id] as const,
  },

  redemptions: {
    all: ["redemptions"] as const,
    mine: ["redemptions", "mine"] as const,
  },

  points: {
    balance: ["points", "balance"] as const,
    history: ["points", "history"] as const,
  },
} as const
