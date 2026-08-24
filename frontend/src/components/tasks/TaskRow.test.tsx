import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { TaskRow } from './TaskRow'
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

// TaskRow renders a <tr>, so it needs a real table ancestor to mount the way
// TaskTable actually uses it.
function renderRow(task: Task) {
  return renderWithProviders(
    <table>
      <tbody>
        <TaskRow task={task} onEdit={() => {}} />
      </tbody>
    </table>,
  )
}

async function openActionsMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/vazifa amallari/i))
}

describe('TaskRow actions menu', () => {
  beforeEach(() => {
    mockedSkipTask.mockReset()
    mockedCompleteTask.mockReset()
    mockedReopenTask.mockReset()
    mockedDeleteTask.mockReset()
    mockedSnoozeTask.mockReset()
  })

  it('shows a skip item for a recurring, pending task', async () => {
    const user = userEvent.setup()
    renderRow(fakeTask({ repeat_type: 'daily' }))

    await openActionsMenu(user)
    expect(await screen.findByText(/o'tkazib yuborish/i)).toBeInTheDocument()
  })

  it('hides the skip item for a non-recurring task', async () => {
    const user = userEvent.setup()
    renderRow(fakeTask({ repeat_type: 'none' }))

    await openActionsMenu(user)
    expect(await screen.findByText(/keyinga qoldirish/i)).toBeInTheDocument()
    expect(screen.queryByText(/o'tkazib yuborish/i)).not.toBeInTheDocument()
  })

  it('hides the skip item once the task is completed', async () => {
    const user = userEvent.setup()
    renderRow(fakeTask({ repeat_type: 'daily', status: 'completed' }))

    await openActionsMenu(user)
    expect(await screen.findByText(/o'chirish/i)).toBeInTheDocument()
    expect(screen.queryByText(/o'tkazib yuborish/i)).not.toBeInTheDocument()
  })

  it('calls the skip API with this task’s id when clicked', async () => {
    mockedSkipTask.mockResolvedValue(
      fakeTask({ id: 't2', due_date: '2026-08-13', repeat_type: 'daily' }),
    )
    const user = userEvent.setup()
    renderRow(fakeTask({ repeat_type: 'daily' }))

    await openActionsMenu(user)
    await user.click(await screen.findByText(/o'tkazib yuborish/i))

    await waitFor(() => expect(mockedSkipTask).toHaveBeenCalledWith('t1'))
  })

  it('toggles completion via the checkbox', async () => {
    mockedCompleteTask.mockResolvedValue(fakeTask({ status: 'completed' }))
    const user = userEvent.setup()
    renderRow(fakeTask())

    await user.click(screen.getByLabelText(/bajarildi deb belgilash/i))

    await waitFor(() => expect(mockedCompleteTask).toHaveBeenCalledWith('t1'))
  })
})
