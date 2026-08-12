import { authorizedRequest } from './authorizedRequest'
import type { Priority, RepeatType, Task, TaskListResponse } from '../types/task'

export interface TaskListParams {
  filter?: 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'completed'
  category_id?: string
  priority?: Priority
  status?: string
  search?: string
  sort_by?: 'due_date' | 'priority' | 'created_at'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

function buildQuery(params: TaskListParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function fetchTasks(params: TaskListParams = {}): Promise<TaskListResponse> {
  return authorizedRequest<TaskListResponse>(`/v1/tasks${buildQuery(params)}`)
}

export interface TaskInput {
  title: string
  description?: string | null
  due_date: string
  due_time: string
  repeat_type?: RepeatType
  category_id?: string | null
  priority?: Priority
}

export function createTask(input: TaskInput): Promise<Task> {
  return authorizedRequest<Task>('/v1/tasks', { method: 'POST', body: input })
}

export function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  return authorizedRequest<Task>(`/v1/tasks/${id}`, { method: 'PATCH', body: input })
}

export function deleteTask(id: string): Promise<void> {
  return authorizedRequest<void>(`/v1/tasks/${id}`, { method: 'DELETE' })
}

export function completeTask(id: string): Promise<Task> {
  return authorizedRequest<Task>(`/v1/tasks/${id}/complete`, { method: 'POST' })
}

export function reopenTask(id: string): Promise<Task> {
  return authorizedRequest<Task>(`/v1/tasks/${id}/reopen`, { method: 'POST' })
}

export interface SnoozeInput {
  preset?: '15m' | '1h' | 'tomorrow'
  snoozed_until?: string
}

export function snoozeTask(id: string, input: SnoozeInput): Promise<Task> {
  return authorizedRequest<Task>(`/v1/tasks/${id}/snooze`, { method: 'POST', body: input })
}

export function skipTask(id: string): Promise<Task> {
  return authorizedRequest<Task>(`/v1/tasks/${id}/skip`, { method: 'POST' })
}
