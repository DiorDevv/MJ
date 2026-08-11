import { authorizedRequest } from './authorizedRequest'
import type { StatsResponse } from '../types/stats'

export type StatsPeriod = 'daily' | 'weekly' | 'monthly'

export function fetchStats(period: StatsPeriod): Promise<StatsResponse> {
  return authorizedRequest<StatsResponse>(`/v1/stats?period=${period}`)
}
