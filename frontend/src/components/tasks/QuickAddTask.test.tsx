import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { QuickAddTask } from './QuickAddTask'
import { createTask } from '../../api/tasks'
import { fetchCategories } from '../../api/categories'
import type { Category, Task } from '../../types/task'

vi.mock('../../api/tasks', () => ({
  createTask: vi.fn(),
}))
vi.mock('../../api/categories', () => ({
  fetchCategories: vi.fn(),
}))

const mockedCreateTask = vi.mocked(createTask)
const mockedFetchCategories = vi.mocked(fetchCategories)

const FAKE_CATEGORY: Category = { id: 'cat-1', name: 'Uy', color: '#6366f1' }

const FAKE_TASK: Task = {
  id: 'task-1',
  title: 'Sut sotib olish',
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
}

describe('QuickAddTask', () => {
  beforeEach(() => {
    mockedCreateTask.mockReset()
    mockedCreateTask.mockResolvedValue(FAKE_TASK)
    mockedFetchCategories.mockReset()
    mockedFetchCategories.mockResolvedValue([FAKE_CATEGORY])
  })

  it('creates a task defaulting to today at 09:00 and clears the input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickAddTask />)

    const input = screen.getByPlaceholderText(/tez vazifa qo'shish/i)
    await user.type(input, 'Sut sotib olish{Enter}')

    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalledTimes(1))
    expect(mockedCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sut sotib olish', due_time: '09:00:00' }),
    )
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('applies the active category/priority filters to the new task', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickAddTask categoryId="cat-1" priority="high" />)

    const input = screen.getByPlaceholderText(/tez vazifa qo'shish/i)
    await user.type(input, 'Hisobot{Enter}')

    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalledTimes(1))
    expect(mockedCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'cat-1', priority: 'high' }),
    )
  })

  it('does not submit an empty or whitespace-only title', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickAddTask />)

    const input = screen.getByPlaceholderText(/tez vazifa qo'shish/i)
    await user.type(input, '   {Enter}')

    expect(mockedCreateTask).not.toHaveBeenCalled()
  })

  it('parses "!muhim #uy" shorthand into priority and category, overriding filter defaults', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickAddTask categoryId="cat-other" priority="low" />)

    const input = await screen.findByPlaceholderText(/tez vazifa qo'shish/i)
    await waitFor(() => expect(mockedFetchCategories).toHaveBeenCalled())
    await user.type(input, '!muhim #uy kir yuvish{Enter}')

    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalledTimes(1))
    expect(mockedCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'kir yuvish', priority: 'high', category_id: 'cat-1' }),
    )
  })

  it('creates one task per comma-separated item, sharing the same date/time', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickAddTask />)

    const input = screen.getByPlaceholderText(/tez vazifa qo'shish/i)
    await user.type(input, 'sut olish, non olish, kir yuvish{Enter}')

    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalledTimes(3))
    const titles = mockedCreateTask.mock.calls.map(([input]) => input.title)
    expect(titles).toEqual(['sut olish', 'non olish', 'kir yuvish'])
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('pressing "n" anywhere on the page focuses the quick-add input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickAddTask />)

    const input = screen.getByPlaceholderText(/tez vazifa qo'shish/i)
    expect(input).not.toHaveFocus()

    await user.keyboard('n')
    expect(input).toHaveFocus()
  })

  it('does not steal focus when "n" is typed inside another field', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <input aria-label="boshqa maydon" />
        <QuickAddTask />
      </>,
    )

    const other = screen.getByLabelText('boshqa maydon')
    const quickAddInput = screen.getByPlaceholderText(/tez vazifa qo'shish/i)

    await user.click(other)
    await user.keyboard('n')

    expect(other).toHaveValue('n')
    expect(quickAddInput).not.toHaveFocus()
  })
})
