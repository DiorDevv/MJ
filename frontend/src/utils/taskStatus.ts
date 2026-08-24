import type { Task } from '../types/task'

export type DisplayStatus = 'overdue' | 'due_soon' | 'completed' | 'snoozed' | 'scheduled'

const DUE_SOON_WINDOW_HOURS = 3

/** Derives a single at-a-glance status from a task's own fields — used for the
 * status dot+label everywhere a task renders (daily/list/week), instead of each
 * page computing (and possibly disagreeing on) "is this overdue" itself. */
export function getDisplayStatus(task: Task, now: Date = new Date()): DisplayStatus {
  if (task.status === 'completed') return 'completed'
  if (task.status === 'snoozed') return 'snoozed'

  const dueAt = new Date(`${task.due_date}T${task.due_time}`)
  if (dueAt.getTime() < now.getTime()) return 'overdue'

  const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (60 * 60 * 1000)
  if (hoursUntilDue <= DUE_SOON_WINDOW_HOURS) return 'due_soon'

  return 'scheduled'
}

export const STATUS_DOT_CLASS: Record<DisplayStatus, string> = {
  overdue: 'bg-danger',
  due_soon: 'bg-warning',
  completed: 'bg-success',
  snoozed: 'bg-muted',
  scheduled: 'bg-muted',
}

export const STATUS_TEXT_CLASS: Record<DisplayStatus, string> = {
  overdue: 'text-danger',
  due_soon: 'text-warning',
  completed: 'text-success',
  snoozed: 'text-muted',
  scheduled: 'text-muted',
}

export const STATUS_LABEL_KEY: Record<DisplayStatus, string> = {
  overdue: 'tasks.status_overdue',
  due_soon: 'tasks.status_dueSoon',
  completed: 'tasks.status_completed',
  snoozed: 'tasks.status_snoozed',
  scheduled: 'tasks.status_scheduled',
}

// Badge pill (subtle background + matching text) for the states worth calling
// out explicitly; "scheduled" (a normal upcoming task) deliberately has no
// pill anywhere it's used — every row being badged would defeat the point.
export const STATUS_BADGE_CLASS: Record<DisplayStatus, string> = {
  overdue: 'bg-danger-subtle text-danger',
  due_soon: 'bg-warning-subtle text-warning',
  completed: 'bg-success-subtle text-success',
  snoozed: 'bg-surface-active text-muted',
  scheduled: 'bg-surface-active text-muted',
}

export const PRIORITY_DOT_CLASS: Record<Task['priority'], string> = {
  low: 'bg-success',
  medium: 'bg-warning',
  high: 'bg-danger',
}
