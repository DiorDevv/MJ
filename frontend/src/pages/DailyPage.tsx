import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheckBig, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, uz } from 'date-fns/locale'
import { useTasks } from '../hooks/useTasks'
import { TaskTable } from '../components/tasks/TaskTable'
import { TaskTableSkeleton } from '../components/tasks/TaskTableSkeleton'
import { StatsStrip } from '../components/tasks/StatsStrip'
import { TaskModal } from '../components/tasks/TaskModal'
import { QuickAddTask } from '../components/tasks/QuickAddTask'
import { EmptyState } from '../components/tasks/EmptyState'
import { Button } from '../components/ui'
import type { Task } from '../types/task'

export function DailyPage() {
  const { t, i18n } = useTranslation()
  const overdueQuery = useTasks({ filter: 'overdue', sort_by: 'due_date', sort_order: 'asc' })
  const todayQuery = useTasks({ filter: 'today', sort_by: 'due_date', sort_order: 'asc' })
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined)

  const isLoading = overdueQuery.isLoading || todayQuery.isLoading
  const overdueTasks = overdueQuery.data?.items ?? []
  const todayTasks = todayQuery.data?.items ?? []
  const isEmpty = !isLoading && overdueTasks.length === 0 && todayTasks.length === 0

  const locale = i18n.language.startsWith('en') ? enUS : uz
  const todayDone = todayTasks.filter((task) => task.status === 'completed').length
  const completionRate =
    todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.today')}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {format(new Date(), 'd-MMMM, EEEE', { locale })}
            {todayTasks.length > 0 && (
              <span>
                {' · '}
                {t('tasks.todayProgress', { done: todayDone, total: todayTasks.length })}
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={() => setModalTask(null)}
          leftIcon={<Plus className="size-4" aria-hidden="true" />}
        >
          {t('tasks.addTask')}
        </Button>
      </div>

      {!isLoading && (
        <StatsStrip
          dueToday={todayTasks.length}
          overdue={overdueTasks.length}
          completionRate={completionRate}
        />
      )}

      <QuickAddTask />

      {isLoading && <TaskTableSkeleton rows={5} />}

      {isEmpty && (
        <EmptyState
          title={t('tasks.todayEmptyTitle')}
          body={t('tasks.todayEmptyBody')}
          icon={CircleCheckBig}
        />
      )}

      {overdueTasks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-danger uppercase">
            {t('tasks.overdueSection')}
          </h2>
          <TaskTable tasks={overdueTasks} onEdit={setModalTask} />
        </section>
      )}

      {todayTasks.length > 0 && (
        <section className="flex flex-col gap-3">
          {overdueTasks.length > 0 && (
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
              {t('tasks.todaySection')}
            </h2>
          )}
          <TaskTable tasks={todayTasks} onEdit={setModalTask} />
        </section>
      )}

      <TaskModal
        isOpen={modalTask !== undefined}
        onClose={() => setModalTask(undefined)}
        task={modalTask}
      />
    </div>
  )
}
