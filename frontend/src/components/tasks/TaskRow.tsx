import { useTranslation } from 'react-i18next'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { motion } from 'framer-motion'
import { AlarmClock, Clock, MoreHorizontal, Repeat, SkipForward, Trash2 } from 'lucide-react'
import type { Task } from '../../types/task'
import { Checkbox } from '../ui'
import { cn } from '../../utils/cn'
import {
  getDisplayStatus,
  PRIORITY_DOT_CLASS,
  STATUS_BADGE_CLASS,
  STATUS_DOT_CLASS,
  STATUS_LABEL_KEY,
  STATUS_TEXT_CLASS,
} from '../../utils/taskStatus'
import {
  useCompleteTask,
  useReopenTask,
  useSkipTask,
  useSnoozeTask,
  useUndoableDelete,
} from '../../hooks/useTaskMutations'
import { showErrorToast, showSuccessToast, showUndoToast } from '../../utils/toast'
import { ApiError } from '../../api/client'

interface TaskRowProps {
  task: Task
  onEdit: (task: Task) => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

const SNOOZE_PRESETS = ['15m', '1h', 'tomorrow'] as const
const SNOOZE_LABEL_KEYS: Record<(typeof SNOOZE_PRESETS)[number], string> = {
  '15m': 'tasks.snooze15m',
  '1h': 'tasks.snooze1h',
  tomorrow: 'tasks.snoozeTomorrow',
}

const menuItemClass =
  'flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-surface-active'

export function TaskRow({ task, onEdit, selectable, selected, onToggleSelect }: TaskRowProps) {
  const { t } = useTranslation()
  const completeMutation = useCompleteTask()
  const reopenMutation = useReopenTask()
  const skipMutation = useSkipTask()
  const snoozeMutation = useSnoozeTask()
  const { scheduleDelete, cancelDelete } = useUndoableDelete()

  const isCompleted = task.status === 'completed'
  const isRecurring = task.repeat_type !== 'none'
  const status = getDisplayStatus(task)

  const handleToggle = () => {
    const mutation = isCompleted ? reopenMutation : completeMutation
    mutation.mutate(task.id, { onError: () => showErrorToast(t('tasks.loadError')) })
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

  const handleSnooze = (preset: (typeof SNOOZE_PRESETS)[number]) => {
    snoozeMutation.mutate(
      { id: task.id, input: { preset } },
      {
        onSuccess: () => showSuccessToast(t('tasks.snoozedSuccess')),
        onError: (error) => {
          showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
        },
      },
    )
  }

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'group border-b border-border transition-colors last:border-b-0 hover:bg-surface-hover',
        isCompleted && 'opacity-60',
      )}
    >
      <td className="w-px py-2 pr-0 pl-3 whitespace-nowrap">
        <div className="flex items-center gap-2.5">
          {selectable && (
            <Checkbox
              checked={selected ?? false}
              onChange={() => onToggleSelect?.(task.id)}
              aria-label={t('tasks.selectTask')}
            />
          )}
          <Checkbox
            checked={isCompleted}
            onChange={handleToggle}
            aria-label={t(isCompleted ? 'tasks.reopen' : 'tasks.complete')}
          />
        </div>
      </td>

      <td className="min-w-0 py-2 pr-3 pl-3">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span
            className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT_CLASS[status])}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span
              className={cn(
                'block truncate text-sm font-medium text-foreground',
                isCompleted && 'text-muted line-through',
              )}
            >
              {task.title}
            </span>
            {task.description && (
              <span className="block truncate text-xs text-muted">{task.description}</span>
            )}
          </span>
          {isRecurring && <Repeat className="size-3.5 shrink-0 text-muted" aria-hidden="true" />}
        </button>
      </td>

      <td className="hidden py-2 pr-3 whitespace-nowrap md:table-cell">
        {task.category && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: task.category.color }}
              aria-hidden="true"
            />
            {task.category.name}
          </span>
        )}
      </td>

      <td className="hidden py-2 pr-3 whitespace-nowrap sm:table-cell">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span
            className={cn('size-1.5 shrink-0 rounded-full', PRIORITY_DOT_CLASS[task.priority])}
            aria-hidden="true"
          />
          {t(`tasks.priority_${task.priority}`)}
        </span>
      </td>

      <td className="py-2 pr-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 font-mono text-xs',
              STATUS_TEXT_CLASS[status],
            )}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            {task.due_time.slice(0, 5)}
          </span>
          {status !== 'scheduled' && (
            <span
              className={cn(
                'hidden items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap lg:inline-flex',
                STATUS_BADGE_CLASS[status],
              )}
            >
              {t(STATUS_LABEL_KEY[status])}
            </span>
          )}
        </div>
      </td>

      <td className="w-px py-2 pr-3 whitespace-nowrap">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={t('tasks.rowActions')}
              className="flex size-8 items-center justify-center rounded-md text-muted opacity-100 transition-colors hover:bg-surface-active hover:text-foreground focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:opacity-0 sm:group-hover:opacity-100"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="radix-pop z-30 w-44 overflow-hidden rounded-md border border-border bg-surface-hover p-1 shadow-lg"
            >
              {!isCompleted && (
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger className={cn(menuItemClass, 'justify-between')}>
                    <span className="flex items-center gap-2">
                      <AlarmClock className="size-4 text-muted" aria-hidden="true" />
                      {t('tasks.snooze')}
                    </span>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      sideOffset={4}
                      className="radix-pop z-30 w-36 overflow-hidden rounded-md border border-border bg-surface-hover p-1 shadow-lg"
                    >
                      {SNOOZE_PRESETS.map((preset) => (
                        <DropdownMenu.Item
                          key={preset}
                          onSelect={() => handleSnooze(preset)}
                          className={menuItemClass}
                        >
                          {t(SNOOZE_LABEL_KEYS[preset])}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>
              )}
              {!isCompleted && isRecurring && (
                <DropdownMenu.Item onSelect={handleSkip} className={menuItemClass}>
                  <SkipForward className="size-4 text-muted" aria-hidden="true" />
                  {t('tasks.skip')}
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={handleDelete}
                className={cn(menuItemClass, 'text-danger data-[highlighted]:bg-danger-subtle')}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t('common.delete')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </td>
    </motion.tr>
  )
}
