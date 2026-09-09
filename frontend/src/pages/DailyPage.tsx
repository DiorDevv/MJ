import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CalendarClock, CircleCheckBig, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, uz } from 'date-fns/locale'
import { useTasks } from '../hooks/useTasks'
import { TaskTable } from '../components/tasks/TaskTable'
import { TaskTableSkeleton } from '../components/tasks/TaskTableSkeleton'
import { TaskModal } from '../components/tasks/TaskModal'
import { QuickAddTask } from '../components/tasks/QuickAddTask'
import { EmptyState } from '../components/tasks/EmptyState'
import { Button, Card, ProgressRing, StatTile } from '../components/ui'
import { PageHeader } from '../components/layout/PageHeader'
import { Page } from '../components/layout/Page'
import type { Task } from '../types/task'

function SectionHeading({ label, count, tone }: { label: string; count: number; tone?: string }) {
  return (
    <h2
      className={`flex items-center gap-2 text-sm font-semibold tracking-wide uppercase ${tone ?? 'text-muted'}`}
    >
      {label}
      <span className="rounded-full bg-surface-hover px-1.5 py-0.5 font-mono text-[11px] text-muted">
        {count}
      </span>
    </h2>
  )
}

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
  const completionRate = todayTasks.length > 0 ? todayDone / todayTasks.length : 0
  const nextUp = [...todayTasks, ...overdueTasks].find((task) => task.status !== 'completed')

  return (
    <Page>
      <PageHeader
        title={t('nav.today')}
        subtitle={format(new Date(), 'd-MMMM, EEEE', { locale })}
        actions={
          <Button
            onClick={() => setModalTask(null)}
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
          >
            {t('tasks.addTask')}
          </Button>
        }
      />

      {!isLoading && !isEmpty && (
        <Card>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <ProgressRing value={completionRate} size={112} label={t('stats.completionRate')}>
              <span className="font-mono text-xl font-bold text-foreground">
                {Math.round(completionRate * 100)}%
              </span>
              <span className="text-[11px] text-muted">
                {t('stats.completedOfTotal', { completed: todayDone, total: todayTasks.length })}
              </span>
            </ProgressRing>
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <StatTile
                label={t('stats.dueToday')}
                value={todayTasks.length}
                icon={CalendarClock}
              />
              <StatTile
                label={t('stats.overdueCount')}
                value={overdueTasks.length}
                icon={AlertTriangle}
                tone={overdueTasks.length > 0 ? 'danger' : 'neutral'}
              />
              <StatTile
                label={t('tasks.filterCompleted')}
                value={todayDone}
                icon={CircleCheckBig}
                tone={todayDone > 0 ? 'success' : 'neutral'}
                hint={nextUp ? t('tasks.nextUp', { time: nextUp.due_time.slice(0, 5) }) : undefined}
              />
            </div>
          </div>
        </Card>
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
          <SectionHeading
            label={t('tasks.overdueSection')}
            count={overdueTasks.length}
            tone="text-danger"
          />
          <TaskTable tasks={overdueTasks} onEdit={setModalTask} />
        </section>
      )}

      {todayTasks.length > 0 && (
        <section className="flex flex-col gap-3">
          {overdueTasks.length > 0 && (
            <SectionHeading label={t('tasks.todaySection')} count={todayTasks.length} />
          )}
          <TaskTable tasks={todayTasks} onEdit={setModalTask} />
        </section>
      )}

      <TaskModal
        isOpen={modalTask !== undefined}
        onClose={() => setModalTask(undefined)}
        task={modalTask}
      />
    </Page>
  )
}
