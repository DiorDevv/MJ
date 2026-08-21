import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheckBig, Plus } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { enUS, uz } from 'date-fns/locale'
import { useTasks } from '../hooks/useTasks'
import { TaskCard } from '../components/tasks/TaskCard'
import { TaskModal } from '../components/tasks/TaskModal'
import { QuickAddTask } from '../components/tasks/QuickAddTask'
import { EmptyState } from '../components/tasks/EmptyState'
import { Button, Skeleton } from '../components/ui'
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

      <QuickAddTask />

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      )}

      {isEmpty && (
        <EmptyState
          title={t('tasks.todayEmptyTitle')}
          body={t('tasks.todayEmptyBody')}
          icon={CircleCheckBig}
        />
      )}

      {overdueTasks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-red-600 uppercase">
            {t('tasks.overdueSection')}
          </h2>
          <AnimatePresence initial={false}>
            {overdueTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={setModalTask} isOverdue />
            ))}
          </AnimatePresence>
        </section>
      )}

      {todayTasks.length > 0 && (
        <section className="flex flex-col gap-3">
          {overdueTasks.length > 0 && (
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
              {t('tasks.todaySection')}
            </h2>
          )}
          <AnimatePresence initial={false}>
            {todayTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={setModalTask} />
            ))}
          </AnimatePresence>
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
