import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addDays, format, isBefore, isToday, startOfDay, startOfWeek } from 'date-fns'
import { enUS, uz } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { useTasks } from '../hooks/useTasks'
import { TaskModal } from '../components/tasks/TaskModal'
import { Button, Skeleton } from '../components/ui'
import { PageHeader } from '../components/layout/PageHeader'
import { Page } from '../components/layout/Page'
import type { Task } from '../types/task'
import { cn } from '../utils/cn'

const MAX_VISIBLE_CHIPS = 4

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

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of data?.items ?? []) {
      map.set(task.due_date, [...(map.get(task.due_date) ?? []), task])
    }
    return map
  }, [data])

  return (
    <Page>
      <PageHeader
        title={t('nav.week')}
        subtitle={
          format(weekStart, 'd MMM', { locale }) +
          ' – ' +
          format(addDays(weekStart, 6), 'd MMM', { locale })
        }
        actions={
          <Button
            onClick={() => openNewTaskModal()}
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
          >
            {t('tasks.addTask')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDate.get(key) ?? []
            const done = dayTasks.filter((task) => task.status === 'completed').length
            const today = isToday(day)
            const past = isBefore(startOfDay(day), startOfDay(new Date())) && !today
            const visible = dayTasks.slice(0, MAX_VISIBLE_CHIPS)
            const hidden = dayTasks.length - visible.length

            return (
              <div
                key={key}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border bg-surface p-3 shadow-card transition-colors',
                  today
                    ? 'border-t-2 border-t-accent border-x-border border-b-border bg-accent-subtle/30'
                    : 'border-border',
                  past && 'opacity-70',
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase',
                      today ? 'text-accent' : 'text-muted',
                    )}
                  >
                    {format(day, 'EEE', { locale })}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    {dayTasks.length > 0 && (
                      <span className="font-mono text-[10px] text-muted">
                        {done}/{dayTasks.length}
                      </span>
                    )}
                    <span className="text-sm font-bold text-foreground">{format(day, 'd')}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  {dayTasks.length === 0 ? (
                    <p className="py-1 text-xs text-muted/60">{t('tasks.noTasks')}</p>
                  ) : (
                    <>
                      {visible.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => setModalTask(task)}
                          className={cn(
                            'truncate rounded-md border-l-2 bg-surface-hover px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-surface-active',
                            task.status === 'completed' && 'text-muted line-through',
                          )}
                          style={{
                            borderLeftColor:
                              task.category?.color ??
                              (task.priority === 'high'
                                ? 'var(--color-danger)'
                                : task.priority === 'medium'
                                  ? 'var(--color-warning)'
                                  : 'var(--color-border-strong)'),
                          }}
                        >
                          {task.due_time.slice(0, 5)} · {task.title}
                        </button>
                      ))}
                      {hidden > 0 && (
                        <button
                          type="button"
                          onClick={() => setModalTask(dayTasks[MAX_VISIBLE_CHIPS] ?? null)}
                          className="px-2 py-0.5 text-left text-[11px] text-muted hover:text-foreground"
                        >
                          {t('tasks.moreTasks', { count: hidden })}
                        </button>
                      )}
                    </>
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
    </Page>
  )
}
