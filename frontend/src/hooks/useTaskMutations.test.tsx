import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useUndoableDelete } from './useTaskMutations'
import { TASKS_QUERY_KEY } from './useTasks'
import { createTestQueryClient } from '../test/utils'
import { deleteTask } from '../api/tasks'
import type { Task, TaskListResponse } from '../types/task'

vi.mock('../api/tasks', () => ({
  deleteTask: vi.fn(),
}))

const mockedDeleteTask = vi.mocked(deleteTask)

function fakeTask(id: string): Task {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    due_date: '2026-08-12',
    due_time: '09:00:00',
    repeat_type: 'none',
    category: null,
    priority: 'medium',
    status: 'pending',
    snoozed_until: null,
    created_via: 'web',
    has_voice_note: false,
    created_at: '2026-08-12T00:00:00Z',
    updated_at: '2026-08-12T00:00:00Z',
  }
}

function seedTasksCache(queryClient: QueryClient, ids: string[]): void {
  const response: TaskListResponse = {
    items: ids.map(fakeTask),
    total: ids.length,
    limit: 20,
    offset: 0,
  }
  queryClient.setQueryData([TASKS_QUERY_KEY, { filter: 'today' }], response)
}

function cachedIds(queryClient: QueryClient): string[] {
  const data = queryClient.getQueryData<TaskListResponse>([TASKS_QUERY_KEY, { filter: 'today' }])
  return data?.items.map((task) => task.id) ?? []
}

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUndoableDelete', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockedDeleteTask.mockReset()
    mockedDeleteTask.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('removes the task from the cache immediately, without calling the API', () => {
    const queryClient = createTestQueryClient()
    seedTasksCache(queryClient, ['a1', 'b1'])
    const { result } = renderHook(() => useUndoableDelete(), { wrapper: wrapperFor(queryClient) })

    act(() => result.current.scheduleDelete('a1'))

    expect(cachedIds(queryClient)).toEqual(['b1'])
    expect(mockedDeleteTask).not.toHaveBeenCalled()
  })

  it('only calls the delete API once the undo window has elapsed', async () => {
    const queryClient = createTestQueryClient()
    seedTasksCache(queryClient, ['a2', 'b2'])
    const { result } = renderHook(() => useUndoableDelete(), { wrapper: wrapperFor(queryClient) })

    act(() => result.current.scheduleDelete('a2'))
    expect(mockedDeleteTask).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(mockedDeleteTask).toHaveBeenCalledWith('a2')
  })

  it('cancelDelete restores the task and the API is never called', async () => {
    const queryClient = createTestQueryClient()
    seedTasksCache(queryClient, ['a3', 'b3'])
    const { result } = renderHook(() => useUndoableDelete(), { wrapper: wrapperFor(queryClient) })

    act(() => result.current.scheduleDelete('a3'))
    act(() => result.current.cancelDelete('a3'))

    expect(cachedIds(queryClient)).toEqual(['a3', 'b3'])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(mockedDeleteTask).not.toHaveBeenCalled()
  })
})
