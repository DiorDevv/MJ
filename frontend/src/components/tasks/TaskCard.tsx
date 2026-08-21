import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Clock, Repeat, SkipForward, Trash2 } from 'lucide-react'
import type { Task } from '../../types/task'
import { Badge, Checkbox } from '../ui'
import { cn } from '../../utils/cn'
import { PRIORITY_BORDER_CLASS } from '../../utils/priority'
import {
  useCompleteTask,
  useReopenTask,
  useSkipTask,
  useUndoableDelete,
} from '../../hooks/useTaskMutations'
import { SnoozeMenu } from './SnoozeMenu'
import { showErrorToast, showSuccessToast, showUndoToast } from '../../utils/toast'
import { ApiError } from '../../api/client'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  isOverdue?: boolean
}

export function TaskCard({
  task,
  onEdit,
  selectable,
  selected,
  onToggleSelect,
  isOverdue,
}: TaskCardProps) {
  const { t } = useTranslation()
  const completeMutation = useCompleteTask()
  const reopenMutation = useReopenTask()
  const skipMutation = useSkipTask()
  const { scheduleDelete, cancelDelete } = useUndoableDelete()

  const isCompleted = task.status === 'completed'
  const isRecurring = task.repeat_type !== 'none'

  const handleToggle = () => {
    const mutation = isCompleted ? reopenMutation : completeMutation
    mutation.mutate(task.id, {
      onError: () => showErrorToast(t('tasks.loadError')),
    })
  }

  const handleDelete = () => {
    scheduleDelete(task.id)
    showUndoToast(t('tasks.deletedSuccess'), t('common.undo'), () => cancelDelete(task.id))
  }

  const handleSkip = () => {
    skipMutation.mutate(task.id, {
      onSuccess: () => showSuccessToast(t('tasks.skippedSuccess')),
      onError: (error) => {
        showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
      },
    })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-l-4 border-border bg-surface p-4',
        'shadow-sm transition-[box-shadow,background-color] duration-150 hover:bg-surface-hover hover:shadow-md',
        PRIORITY_BORDER_CLASS[task.priority],
        task.status === 'snoozed' && 'opacity-70',
      )}
    >
      {selectable && (
        <div className="pt-0.5">
          <Checkbox
            checked={selected ?? false}
            onChange={() => onToggleSelect?.(task.id)}
            aria-label={t('tasks.selectTask')}
          />
        </div>
      )}

      <div className="pt-0.5">
        <Checkbox
          checked={isCompleted}
          onChange={handleToggle}
          aria-label={t(isCompleted ? 'tasks.reopen' : 'tasks.complete')}
        />
      </div>

      <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
        <p className={cn('font-medium text-foreground', isCompleted && 'text-muted line-through')}>
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 truncate text-sm text-muted">{task.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span
            className={cn(
              'inline-flex items-center gap-1',
              isOverdue && !isCompleted && 'font-semibold text-red-500',
            )}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            {task.due_time.slice(0, 5)}
          </span>
          {task.repeat_type !== 'none' && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-3.5" aria-hidden="true" />
              {t(`tasks.repeat_${task.repeat_type}`)}
            </span>
          )}
          {task.category && (
            <Badge variant="default">
              <span
                className="mr-1 inline-block size-2 rounded-full"
                style={{ backgroundColor: task.category.color }}
              />
              {task.category.name}
            </Badge>
          )}
        </div>
      </button>

      <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {!isCompleted && <SnoozeMenu taskId={task.id} />}
        {!isCompleted && isRecurring && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipMutation.isPending}
            aria-label={t('tasks.skip')}
            title={t('tasks.skip')}
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            <SkipForward className="size-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          aria-label={t('common.delete')}
          className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  )
}
