import { authorizedRequest } from './authorizedRequest'
import type { ActivityResponse, StatsResponse, StreakResponse } from '../types/stats'

export type StatsPeriod = 'daily' | 'weekly' | 'monthly'

export function fetchStats(period: StatsPeriod): Promise<StatsResponse> {
  return authorizedRequest<StatsResponse>(`/v1/stats?period=${period}`)
}

export function fetchActivity(days = 84): Promise<ActivityResponse> {
  return authorizedRequest<ActivityResponse>(`/v1/stats/activity?days=${days}`)
}

export function fetchStreak(): Promise<StreakResponse> {
  return authorizedRequest<StreakResponse>('/v1/stats/streak')
}
