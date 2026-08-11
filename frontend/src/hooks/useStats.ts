import { useQuery } from '@tanstack/react-query'
import { fetchStats, type StatsPeriod } from '../api/stats'

export function useStats(period: StatsPeriod) {
  return useQuery({
    queryKey: ['stats', period],
    queryFn: () => fetchStats(period),
  })
}
