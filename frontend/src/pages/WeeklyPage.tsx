import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addDays, format, isToday, startOfWeek } from 'date-fns'
import { enUS, uz } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { useTasks } from '../hooks/useTasks'
import { TaskModal } from '../components/tasks/TaskModal'
import { Button, Skeleton } from '../components/ui'
import type { Task } from '../types/task'
import { cn } from '../utils/cn'

export function WeeklyPage() {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useTasks({
    filter: 'this_week',
    sort_by: 'due_date',
    sort_order: 'asc',
  })
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined)
  const [newTaskDate, setNewTaskDate] = useState<string | undefined>(undefined)
  const locale = i18n.language.startsWith('en') ? enUS : uz

  const openNewTaskModal = (date?: string) => {
    setNewTaskDate(date)
    setModalTask(null)
  }

  const days = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of data?.items ?? []) {
      map.set(task.due_date, [...(map.get(task.due_date) ?? []), task])
    }
    return map
  }, [data])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('nav.week')}</h1>
        <Button
          onClick={() => openNewTaskModal()}
          leftIcon={<Plus className="size-4" aria-hidden="true" />}
        >
          {t('tasks.addTask')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDate.get(key) ?? []
            return (
              <div
                key={key}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border border-border bg-surface p-3',
                  isToday(day) && 'ring-2 ring-primary-500',
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-muted uppercase">
                    {format(day, 'EEE', { locale })}
                  </span>
                  <span className="text-sm font-bold text-foreground">{format(day, 'd')}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-muted">—</p>
                  ) : (
                    dayTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setModalTask(task)}
                        className={cn(
                          'truncate rounded-md border-l-2 bg-surface-hover px-2 py-1 text-left text-xs text-foreground',
                          task.status === 'completed' && 'text-muted line-through',
                        )}
                        style={{ borderLeftColor: task.category?.color ?? 'var(--color-border)' }}
                      >
                        {task.due_time.slice(0, 5)} · {task.title}
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => openNewTaskModal(key)}
                    className="mt-1 flex items-center gap-1 rounded-md px-2 py-1 text-left text-xs text-muted hover:bg-surface-hover hover:text-foreground"
                  >
                    <Plus className="size-3" aria-hidden="true" />
                    {t('common.add')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TaskModal
        isOpen={modalTask !== undefined}
        onClose={() => setModalTask(undefined)}
        task={modalTask}
        defaultDate={newTaskDate}
      />
    </div>
  )
}
