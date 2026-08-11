import type { Priority } from '../types/task'

export const PRIORITY_BORDER_CLASS: Record<Priority, string> = {
  low: 'border-l-emerald-500',
  medium: 'border-l-amber-500',
  high: 'border-l-rose-500',
}
