import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Task } from '../../types/task'
import { TaskRow } from './TaskRow'

interface TaskTableProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

export function TaskTable({
  tasks,
  onEdit,
  selectable,
  selectedIds,
  onToggleSelect,
}: TaskTableProps) {
  const { t } = useTranslation()

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium tracking-wide text-muted uppercase">
              <th className="w-px py-2 pr-0 pl-3" scope="col" />
              <th className="py-2 pr-3 pl-3 font-medium" scope="col">
                {t('tasks.colTask')}
              </th>
              <th className="hidden py-2 pr-3 font-medium md:table-cell" scope="col">
                {t('tasks.category')}
              </th>
              <th className="hidden py-2 pr-3 font-medium sm:table-cell" scope="col">
                {t('tasks.priority')}
              </th>
              <th className="py-2 pr-3 font-medium" scope="col">
                {t('tasks.dueTime')}
              </th>
              <th className="w-px py-2 pr-3" scope="col" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  selectable={selectable}
                  selected={selectedIds?.has(task.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  )
}
