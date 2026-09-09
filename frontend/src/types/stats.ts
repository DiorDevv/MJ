export interface CategoryStat {
  category_id: string | null
  name: string
  color: string
  count: number
}

export interface PriorityStat {
  priority: 'low' | 'medium' | 'high'
  count: number
}

export interface StatsResponse {
  period: 'daily' | 'weekly' | 'monthly'
  completed: number
  pending: number
  total: number
  completion_rate: number
  by_category: CategoryStat[]
  by_priority: PriorityStat[]
}

export interface ActivityDay {
  date: string
  completed: number
  created: number
}

export interface ActivityResponse {
  days: ActivityDay[]
}

export interface StreakResponse {
  current: number
  longest: number
}
