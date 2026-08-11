import { useQuery } from '@tanstack/react-query'
import { fetchTasks, type TaskListParams } from '../api/tasks'

export const TASKS_QUERY_KEY = 'tasks' as const

export function useTasks(params: TaskListParams = {}) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, params],
    queryFn: () => fetchTasks(params),
  })
}
