export interface CategoryStat {
  category_id: string | null
  name: string
  color: string
  count: number
}

export interface StatsResponse {
  period: 'daily' | 'weekly' | 'monthly'
  completed: number
  pending: number
  total: number
  completion_rate: number
  by_category: CategoryStat[]
}
