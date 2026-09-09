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

export interface ActivitySummary {
  total_completed: number
  avg_per_day: number
  /** 0 = Monday … 6 = Sunday; null when nothing completed in the window. */
  best_weekday: number | null
}

export interface ActivityResponse {
  days: ActivityDay[]
  summary: ActivitySummary
}

export interface StreakResponse {
  current: number
  longest: number
}
