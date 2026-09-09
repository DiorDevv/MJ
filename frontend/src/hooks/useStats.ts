import { useQuery } from '@tanstack/react-query'
import { fetchActivity, fetchStats, fetchStreak, type StatsPeriod } from '../api/stats'

export function useStats(period: StatsPeriod) {
  return useQuery({
    queryKey: ['stats', period],
    queryFn: () => fetchStats(period),
  })
}

export function useActivity(days = 84) {
  return useQuery({
    queryKey: ['stats', 'activity', days],
    queryFn: () => fetchActivity(days),
  })
}

export function useStreak() {
  return useQuery({
    queryKey: ['stats', 'streak'],
    queryFn: () => fetchStreak(),
  })
}
