import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { TaskCard } from './TaskCard'
import { completeTask, deleteTask, reopenTask, skipTask, snoozeTask } from '../../api/tasks'
import type { Task } from '../../types/task'

vi.mock('../../api/tasks', () => ({
  completeTask: vi.fn(),
  reopenTask: vi.fn(),
  skipTask: vi.fn(),
  deleteTask: vi.fn(),
  snoozeTask: vi.fn(),
}))

const mockedSkipTask = vi.mocked(skipTask)
const mockedCompleteTask = vi.mocked(completeTask)
const mockedReopenTask = vi.mocked(reopenTask)
const mockedDeleteTask = vi.mocked(deleteTask)
const mockedSnoozeTask = vi.mocked(snoozeTask)

function fakeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Kunlik mashq',
    description: null,
    due_date: '2026-08-12',
    due_time: '09:00:00',
    repeat_type: 'none',
    category: null,
    priority: 'medium',
    status: 'pending',
    snoozed_until: null,
    created_via: 'web',
    created_at: '2026-08-12T00:00:00Z',
    updated_at: '2026-08-12T00:00:00Z',
    ...overrides,
  }
}

describe('TaskCard skip action', () => {
  beforeEach(() => {
    mockedSkipTask.mockReset()
    mockedCompleteTask.mockReset()
    mockedReopenTask.mockReset()
    mockedDeleteTask.mockReset()
    mockedSnoozeTask.mockReset()
  })

  it('shows the skip button for a recurring, pending task', () => {
    renderWithProviders(<TaskCard task={fakeTask({ repeat_type: 'daily' })} onEdit={() => {}} />)
    expect(screen.getByLabelText(/o'tkazib yuborish/i)).toBeInTheDocument()
  })

  it('hides the skip button for a non-recurring task', () => {
    renderWithProviders(<TaskCard task={fakeTask({ repeat_type: 'none' })} onEdit={() => {}} />)
    expect(screen.queryByLabelText(/o'tkazib yuborish/i)).not.toBeInTheDocument()
  })

  it('hides the skip button once the task is completed', () => {
    renderWithProviders(
      <TaskCard task={fakeTask({ repeat_type: 'daily', status: 'completed' })} onEdit={() => {}} />,
    )
    expect(screen.queryByLabelText(/o'tkazib yuborish/i)).not.toBeInTheDocument()
  })

  it('calls the skip API with this task’s id when clicked', async () => {
    mockedSkipTask.mockResolvedValue(
      fakeTask({ id: 't2', due_date: '2026-08-13', repeat_type: 'daily' }),
    )
    const user = userEvent.setup()
    renderWithProviders(<TaskCard task={fakeTask({ repeat_type: 'daily' })} onEdit={() => {}} />)

    await user.click(screen.getByLabelText(/o'tkazib yuborish/i))

    await waitFor(() => expect(mockedSkipTask).toHaveBeenCalledWith('t1'))
  })
})
