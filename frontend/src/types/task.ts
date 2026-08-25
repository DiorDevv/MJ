export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly'
export type Priority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'completed' | 'snoozed'
export type CreatedVia = 'web' | 'telegram'

export interface Category {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  due_date: string
  due_time: string
  repeat_type: RepeatType
  category: Category | null
  priority: Priority
  status: TaskStatus
  snoozed_until: string | null
  created_via: CreatedVia
  created_at: string
  updated_at: string
  has_voice_note: boolean
}

export interface TaskListResponse {
  items: Task[]
  total: number
  limit: number
  offset: number
}
