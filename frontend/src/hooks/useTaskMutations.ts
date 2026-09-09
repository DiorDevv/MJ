import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  completeTask,
  createTask,
  deleteTask,
  reopenTask,
  skipTask,
  snoozeTask,
  updateTask,
  type SnoozeInput,
  type TaskInput,
  type UpdateScope,
} from '../api/tasks'
import type { Task, TaskListResponse, TaskStatus } from '../types/task'
import { TASKS_QUERY_KEY } from './useTasks'

type TasksQueryData = [readonly unknown[], TaskListResponse | undefined][]

/**
 * Optimistically patches every cached tasks-list query (today/week/list all
 * share the ['tasks', params] prefix) so the change is visible instantly across
 * views, then rolls back on error and reconciles with the server on settle.
 */
function useOptimisticTaskUpdate() {
  const queryClient = useQueryClient()

  return {
    apply: async (id: string, patch: Partial<Task>) => {
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] })
      const previous: TasksQueryData = queryClient.getQueriesData({
        queryKey: [TASKS_QUERY_KEY],
      })
      queryClient.setQueriesData<TaskListResponse>({ queryKey: [TASKS_QUERY_KEY] }, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((task) => (task.id === id ? { ...task, ...patch } : task)),
        }
      })
      return previous
    },
    rollback: (previous: TasksQueryData) => {
      previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    settle: () => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  }
}

export function useCompleteTask() {
  const optimistic = useOptimisticTaskUpdate()
  return useMutation({
    mutationFn: (id: string) => completeTask(id),
    onMutate: (id: string) => optimistic.apply(id, { status: 'completed' as TaskStatus }),
    onError: (_err, _id, previous) => previous && optimistic.rollback(previous),
    onSettled: optimistic.settle,
  })
}

export function useReopenTask() {
  const optimistic = useOptimisticTaskUpdate()
  return useMutation({
    mutationFn: (id: string) => reopenTask(id),
    onMutate: (id: string) => optimistic.apply(id, { status: 'pending' as TaskStatus }),
    onError: (_err, _id, previous) => previous && optimistic.rollback(previous),
    onSettled: optimistic.settle,
  })
}

export function useSnoozeTask() {
  const optimistic = useOptimisticTaskUpdate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SnoozeInput }) => snoozeTask(id, input),
    onMutate: ({ id }) => optimistic.apply(id, { status: 'snoozed' as TaskStatus }),
    onError: (_err, _vars, previous) => previous && optimistic.rollback(previous),
    onSettled: optimistic.settle,
  })
}

export function useSkipTask() {
  const queryClient = useQueryClient()
  return useMutation({
    // Skip replaces the row with a new occurrence (different id), so an
    // optimistic patch doesn't apply the way complete/reopen/snooze do —
    // just refetch once the new occurrence exists server-side.
    mutationFn: (id: string) => skipTask(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] })
      const previous: TasksQueryData = queryClient.getQueriesData({
        queryKey: [TASKS_QUERY_KEY],
      })
      queryClient.setQueriesData<TaskListResponse>({ queryKey: [TASKS_QUERY_KEY] }, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.filter((task) => task.id !== id),
          total: Math.max(0, old.total - 1),
        }
      })
      return previous
    },
    onError: (_err, _id, previous) => {
      previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  })
}

const UNDO_WINDOW_MS = 5000
const pendingDeleteTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingDeleteSnapshots = new Map<string, TasksQueryData>()

/**
 * Delete-with-undo: the task disappears from every cached list immediately,
 * but the DELETE request is deferred until the undo window expires, so
 * cancelling never has to "un-delete" anything server-side.
 */
export function useUndoableDelete() {
  const queryClient = useQueryClient()

  const removeFromCache = (id: string): TasksQueryData => {
    const previous: TasksQueryData = queryClient.getQueriesData({ queryKey: [TASKS_QUERY_KEY] })
    queryClient.setQueriesData<TaskListResponse>({ queryKey: [TASKS_QUERY_KEY] }, (old) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.filter((task) => task.id !== id),
        total: Math.max(0, old.total - 1),
      }
    })
    return previous
  }

  const scheduleDelete = (id: string) => {
    pendingDeleteSnapshots.set(id, removeFromCache(id))
    const timer = setTimeout(() => {
      pendingDeleteTimers.delete(id)
      pendingDeleteSnapshots.delete(id)
      void deleteTask(id)
        .catch(() => {
          // Deletion failed after the undo window closed; resync from the
          // server so a task that's still there doesn't stay hidden.
        })
        .finally(() => {
          void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
        })
    }, UNDO_WINDOW_MS)
    pendingDeleteTimers.set(id, timer)
  }

  const cancelDelete = (id: string) => {
    const timer = pendingDeleteTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      pendingDeleteTimers.delete(id)
    }
    const snapshot = pendingDeleteSnapshots.get(id)
    if (snapshot) {
      snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
      pendingDeleteSnapshots.delete(id)
    }
  }

  return { scheduleDelete, cancelDelete }
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
      scope,
    }: {
      id: string
      input: Partial<TaskInput>
      scope?: UpdateScope
    }) => updateTask(id, input, scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  })
}
