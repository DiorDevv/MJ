import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useTasks, TASKS_QUERY_KEY } from '../hooks/useTasks'
import { useCategories } from '../hooks/useCategories'
import { useUndoableDelete } from '../hooks/useTaskMutations'
import { completeTask } from '../api/tasks'
import { TaskTable } from '../components/tasks/TaskTable'
import { TaskTableSkeleton } from '../components/tasks/TaskTableSkeleton'
import { TaskModal } from '../components/tasks/TaskModal'
import { QuickAddTask } from '../components/tasks/QuickAddTask'
import { EmptyState } from '../components/tasks/EmptyState'
import { Button, Dropdown, Input } from '../components/ui'
import type { DropdownOption } from '../components/ui'
import type { Priority, Task } from '../types/task'
import { showSuccessToast, showUndoToast } from '../utils/toast'

const PAGE_SIZE = 20

type StatusFilter = '' | 'pending' | 'completed' | 'snoozed'
type PriorityFilter = '' | Priority
type SortBy = 'due_date' | 'priority' | 'created_at'

export function ListPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  // Seeded once from ?search= (set by the top bar's global search box) — the
  // URL isn't kept in sync after that, this page's own search input owns it
  // from here on, same as every other filter here.
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [status, setStatus] = useState<StatusFilter>('')
  const [priority, setPriority] = useState<PriorityFilter>('')
  const [categoryId, setCategoryId] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('due_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [offset, setOffset] = useState(0)
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const queryClient = useQueryClient()
  const { scheduleDelete, cancelDelete } = useUndoableDelete()
  const { data: categories = [] } = useCategories()
  const { data, isLoading } = useTasks({
    search: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
    category_id: categoryId || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    limit: PAGE_SIZE,
    offset,
  })

  const tasks = data?.items ?? []
  const total = data?.total ?? 0

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkComplete = async () => {
    const ids = Array.from(selectedIds)
    setSelectedIds(new Set())
    await Promise.allSettled(ids.map((id) => completeTask(id)))
    void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    showSuccessToast(t('tasks.bulkCompletedSuccess', { count: ids.length }))
  }

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds)
    setSelectedIds(new Set())
    ids.forEach((id) => scheduleDelete(id))
    showUndoToast(t('tasks.bulkDeletedSuccess', { count: ids.length }), t('common.undo'), () => {
      ids.forEach((id) => cancelDelete(id))
    })
  }

  const statusOptions: DropdownOption<StatusFilter>[] = [
    { value: '', label: t('tasks.filterAll') },
    { value: 'pending', label: t('tasks.filterPending') },
    { value: 'completed', label: t('tasks.filterCompleted') },
    { value: 'snoozed', label: t('tasks.filterSnoozed') },
  ]
  const priorityOptions: DropdownOption<PriorityFilter>[] = [
    { value: '', label: t('common.all') },
    { value: 'low', label: t('tasks.priority_low') },
    { value: 'medium', label: t('tasks.priority_medium') },
    { value: 'high', label: t('tasks.priority_high') },
  ]
  const categoryOptions: DropdownOption<string>[] = [
    { value: '', label: t('common.all') },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ]
  const sortOptions: DropdownOption<SortBy>[] = [
    { value: 'due_date', label: t('tasks.sortDueDate') },
    { value: 'priority', label: t('tasks.sortPriority') },
    { value: 'created_at', label: t('tasks.sortCreatedAt') },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('nav.list')}</h1>
        <Button
          onClick={() => setModalTask(null)}
          leftIcon={<Plus className="size-4" aria-hidden="true" />}
        >
          {t('tasks.addTask')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <Input
          placeholder={t('tasks.searchPlaceholder')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setOffset(0)
            setSelectedIds(new Set())
          }}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dropdown
            label={t('tasks.filterAll')}
            options={statusOptions}
            value={status}
            onChange={(value) => {
              setStatus(value)
              setOffset(0)
              setSelectedIds(new Set())
            }}
          />
          <Dropdown
            label={t('tasks.priority')}
            options={priorityOptions}
            value={priority}
            onChange={(value) => {
              setPriority(value)
              setOffset(0)
              setSelectedIds(new Set())
            }}
          />
          <Dropdown
            label={t('tasks.category')}
            options={categoryOptions}
            value={categoryId}
            onChange={(value) => {
              setCategoryId(value)
              setOffset(0)
              setSelectedIds(new Set())
            }}
          />
          <div className="flex items-end gap-1.5">
            <Dropdown
              label={t('tasks.sortBy')}
              options={sortOptions}
              value={sortBy}
              onChange={(value) => {
                setSortBy(value)
                setOffset(0)
                setSelectedIds(new Set())
              }}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => {
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                setOffset(0)
                setSelectedIds(new Set())
              }}
              aria-label={t('tasks.sortBy')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="size-4" aria-hidden="true" />
              ) : (
                <ArrowDown className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      <QuickAddTask categoryId={categoryId || undefined} priority={priority || undefined} />

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent-subtle px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {t('tasks.selectedCount', { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => void handleBulkComplete()}>
              {t('tasks.bulkComplete')}
            </Button>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>
              {t('common.delete')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {isLoading && <TaskTableSkeleton rows={6} />}

      {!isLoading && tasks.length === 0 && (
        <EmptyState title={t('tasks.listEmptyTitle')} body={t('tasks.listEmptyBody')} />
      )}

      {!isLoading && tasks.length > 0 && (
        <TaskTable
          tasks={tasks}
          onEdit={setModalTask}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted">
          <Button
            variant="secondary"
            size="sm"
            disabled={offset === 0}
            onClick={() => {
              setOffset(Math.max(0, offset - PAGE_SIZE))
              setSelectedIds(new Set())
            }}
          >
            {t('tasks.prevPage')}
          </Button>
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => {
              setOffset(offset + PAGE_SIZE)
              setSelectedIds(new Set())
            }}
          >
            {t('tasks.nextPage')}
          </Button>
        </div>
      )}

      <TaskModal
        isOpen={modalTask !== undefined}
        onClose={() => setModalTask(undefined)}
        task={modalTask}
      />
    </div>
  )
}
